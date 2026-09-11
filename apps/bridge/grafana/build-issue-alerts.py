"""Reviewable Grafana file provisioning. Rules are intentionally paused."""
import importlib.util
import json
import re
import sys
sys.dont_write_bytecode = True
from pathlib import Path

ROOT = Path(__file__).parent
spec = importlib.util.spec_from_file_location('trial', ROOT/'build-native-trial.py')
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


def fixed(expression):
    for key, value in {'application':'layerswap-frontend','environment':'mainnet','deployment':'','release':'','error_marker':''}.items():
        expression = expression.replace('${'+key+':percentencode}', value)
    assert not re.search(r'\$\{[a-z_]|\$__', expression), 'Unresolved dashboard variable in alert query'
    return expression


def build():
    # Static alert scope needs no dashboard-variable decoding. Keep the repeated
    # comparison query small enough for the Loki gateway's request-URI limit.
    base = '{source="faro"} | logfmt | __error__="" | app_name="layerswap-frontend" | app_environment="mainnet"'
    source = base + ' | kind="exception" | context_impact!="diagnostic" | context_eventType!~"' + trial.BACKGROUND_TYPES + '" | type!="TransactionRejected"'
    source += ' | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}`'
    template = '{{ $m := .value | trim }}'
    for pattern, replacement in trial.NORMALIZATIONS:
        template += '{{ $m = regexReplaceAll ' + json.dumps(pattern) + ' $m ' + json.dumps(replacement) + ' }}'
    source += ' | label_format group_key=`' + template + '{{ printf "v2:%s:%s" .type $m }}`'
    current = 'sum by (group_key, type) (count_over_time(' + source + ' | keep group_key, type [5m]))'
    previous = 'sum by (group_key, type) (count_over_time(' + source + ' | keep group_key, type [24h] offset 5m))'
    def journeys(selector, window):
        return 'count(' + trial.journey_set(selector, base, window) + ')'
    reached_30m = journeys(trial.TRANSFER_REACHED, '30m')
    trouble_30m = journeys(trial.TRANSFER_TROUBLE, '30m')
    # Ratio only once at least five journeys reached the step; otherwise the vector is empty and reads 0.
    trouble_ratio = '((' + trouble_30m + ' or vector(0)) / (' + reached_30m + ' > 4)) or vector(0)'
    reached_2h = journeys(trial.TRANSFER_REACHED, '2h')
    none_submitted = '((' + reached_2h + ' or vector(0)) * (absent_over_time(' + base + trial.TRANSFER_SUBMITTED + ' | keep app_name [2h]) or vector(0)))'
    candidates = [
        ('ls-faro-issue-burst', 'Frontend issue observations exceed 10 in 5m', current+' or vector(0)', 10,
         'Observation threshold, not unique incidents. Tune against real traffic before enabling.'),
        ('ls-faro-unseen-group', 'Frontend group absent from preceding 24h', '('+current+' unless '+previous+') or vector(0)', 2,
         'At least 3 observations in 5m, absent in the preceding retained 24h. This is not first-ever occurrence or a confirmed regression.'),
        ('ls-faro-no-telemetry', 'No frontend telemetry for 15m', 'absent_over_time('+base+' | keep app_name [15m]) or vector(0)', 0,
         'Visibility unknown. May be quiet traffic, sampling, browser delivery, or ingestion failure; use a scheduled canary before paging on this in development.'),
        ('ls-faro-transfer-trouble', 'Blocked or failed transfers exceed 30% of journeys reaching the transfer step in 30m', trouble_ratio, 0.3,
         'Share of journeys that reached the send button and then saw a blocking message or a failed wallet operation, evaluated only once at least five journeys reached the step. User declines are excluded. Open the Transfer step tab for reasons by network and wallet.', 1800),
        ('ls-faro-no-submissions', 'Journeys reach the transfer step but nothing is submitted for 2h', none_submitted, 2,
         'At least three journeys reached the send button in the last two hours and no transaction or gasless authorization was submitted by anyone. Quiet traffic reads as zero; a wallet, RPC or deposit-action outage reads as the number of stranded journeys.', 7200),
    ]
    rules=[]
    for uid,title,expression,threshold,description,*window in candidates:
        expression = fixed(expression)
        seconds = window[0] if window else 300
        rules.append({'uid':uid,'title':title,'condition':'B','for':'5m','isPaused':True,
            'noDataState':'NoData','execErrState':'Error',
            'annotations':{'summary':title,'description':description,'dashboard_url':'https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-trial-home'},
            'labels':{'application':'layerswap-frontend','api_mode':'mainnet','review_required':'true'},
            'data':[
                {'refId':'A','datasourceUid':trial.DS,'relativeTimeRange':{'from':seconds,'to':0},
                 'model':{'refId':'A','datasource':{'type':'loki','uid':trial.DS},'expr':expression,'queryType':'instant','instant':True,'range':False,'intervalMs':1000,'maxDataPoints':1}},
                {'refId':'B','datasourceUid':'__expr__','relativeTimeRange':{'from':0,'to':0},
                 'model':{'refId':'B','type':'threshold','expression':'A','datasource':{'type':'__expr__','uid':'__expr__'},
                    'conditions':[{'evaluator':{'type':'gt','params':[threshold]},'operator':{'type':'and'},'reducer':{'type':'last','params':[]},'type':'query','query':{'params':['B']}}]}}
            ]})
    return {'apiVersion':1,'groups':[{'orgId':1,'name':'frontend-issues-review','folder':'Layerswap frontend alert review','interval':'1m','rules':rules}]}


if __name__=='__main__':
    (ROOT/'faro-issue-alerts.paused.json').write_text(json.dumps(build(),indent=2)+'\n')
