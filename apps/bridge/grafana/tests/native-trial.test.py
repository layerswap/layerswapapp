"""Navigation checks for the native usability trial; no Grafana access required."""
import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('trial', Path(__file__).parents[1] / 'build-native-trial.py')
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


def resolve(template, values, row):
    def replace(match):
        expression = match[1]
        field = re.fullmatch(r'__data.fields\["([^\"]+)"\]:percentencode', expression)
        if field: return quote(str(row[field[1]]), safe="~()*!.'-")
        if expression.endswith(':percentencode'):
            return quote(str(values[expression.removesuffix(':percentencode')]), safe="~()*!.'-")
        return str(values[expression])
    return parse_qs(urlsplit(re.sub(r'\$\{([^}]+)\}', replace, template)).query, keep_blank_values=True)


def data_link(dashboard, panel, field):
    overrides = dashboard['spec']['elements'][panel]['spec']['vizConfig']['spec']['fieldConfig']['overrides']
    return next(p['value'][0]['url'] for o in overrides if o['matcher']['options']==field for p in o['properties'] if p['id']=='links')


class NativeTrialNavigation(unittest.TestCase):
    def setUp(self):
        self.views, self.issue, self.session, self.event = trial.build()
        self.values = dict(trial.VALUES, deployment='preview+ & `', category='Diagnostics', test_errors='Exclude', search='wallet+ & " \\ ` հայերեն', error_marker='error & retry', __from='1000', __to='9000')
        self.row = {'group_key':'hash+ & " \\ `', 'type':'ExampleError', 'impact_category':'Diagnostics', 'test_record':'No', 'release':'release+&', 'session_id':'session+&', 'stored_ns':'ns:1788538401603000001', 'window_from':'3000', 'window_to':'5000'}

    def test_issue_occurrence_focus_and_return_keep_original_scope(self):
        first=resolve(data_link(self.views,'panel-2','summary'),self.values,self.row)
        self.assertEqual(first['var-group_key'],[self.row['group_key']])
        self.assertEqual(first['var-release'],[self.row['release']])
        self.assertEqual(first['var-deployment'], [self.values['deployment']])
        self.assertEqual(first['var-selected_category'], ['Diagnostics'])
        self.assertEqual(first['var-selected_test'], ['No'])
        values=dict(self.values, **{k[4:]:v[0] for k,v in first.items() if k.startswith('var-')})
        second=resolve(data_link(self.issue,'panel-2','activity'),values,self.row)
        self.assertEqual((second['from'],second['to']),(['3000'],['5000']))
        values.update({k[4:]:v[0] for k,v in second.items() if k.startswith('var-')})
        back=resolve(self.session['spec']['links'][0]['url'],values,self.row)
        self.assertEqual((back['from'],back['to']),(['1000'],['9000']))
        self.assertEqual(back['var-search'],[self.values['search']])
        self.assertEqual(back['var-release'],[self.values['release']])
        self.assertEqual(back['var-error_marker'],[self.values['error_marker']])
        self.assertEqual(back['var-category'], ['Diagnostics'])
        self.assertEqual(back['var-test_errors'], ['Exclude'])
        self.assertEqual(back['var-deployment'], [self.values['deployment']])
        self.assertEqual(back['dtab'],['Issues'])
        self.assertTrue(all(len(v)==1 for v in back.values()))

    def test_lookup_does_not_carry_an_old_journey_or_selected_event(self):
        values=dict(self.values,journey_id='old-journey',event_ns='old-event',flow_id='old-form')
        params=resolve(data_link(self.views,'panel-8','session_id'),values,self.row)
        self.assertEqual(params['var-origin_tab'],['Session-lookup'])
        self.assertEqual(params['var-session_id'],[self.row['session_id']])
        self.assertEqual(params['var-journey_id'],[''])
        self.assertEqual(params['var-event_ns'],[''])
        self.assertEqual(params['var-flow_id'],[''])
        self.assertEqual(params['var-deployment'], [self.values['deployment']])

    def test_deployment_filter_is_optional_and_independent_of_api_mode(self):
        self.assertEqual(trial.VALUES['deployment'], '')
        self.assertNotIn('environment', trial.VALUES)
        self.assertNotIn('.app_environment', trial.BASE)
        self.assertIn('page_attr_deployment_environment', trial.BASE)
        self.assertIn('{{ else }}unknown{{ end }}', trial.BASE)
        self.assertIn('or (eq .needle_deployment "") (eq .deployment .needle_deployment)', trial.BASE)
        for dashboard in [self.views, self.issue]:
            variable = next(v['spec'] for v in dashboard['spec']['variables'] if v['spec']['name'] == 'deployment')
            self.assertEqual(variable['hide'], 'dontHide')
            self.assertEqual(variable['label'], 'Deployment (blank = all)')
        for dashboard in trial.build():
            # Old bookmarked var-environment values must not silently narrow
            # results after the API-mode selector is removed.
            self.assertNotIn('var-environment=', json.dumps(dashboard))
            self.assertNotIn('${environment:', json.dumps(dashboard))
            for panel in dashboard['spec']['elements'].values():
                for query in panel['spec']['data']['spec']['queries']:
                    self.assertIn('${deployment:percentencode}', query['spec']['query']['spec']['expr'])

    def test_form_visit_link_uses_aggregate_timestamps_and_clears_old_journey(self):
        row = dict(self.row, event_data_flow_id='form+ & `')
        for name in ['stored_ns', 'window_from', 'window_to']:
            row[name + ' (first)'] = row[name]
        params=resolve(data_link(self.views,'panel-37','event_data_flow_id'),dict(self.values,journey_id='old'),row)
        self.assertEqual(params['var-flow_id'], [row['event_data_flow_id']])
        self.assertEqual(params['var-journey_id'], [''])
        self.assertEqual((params['from'],params['to']), (['3000'],['5000']))
        self.assertEqual(params['var-origin_tab'], ['Behavior'])

    def test_tempo_link_preserves_exact_trace_id_and_time_range(self):
        trace_id = '0123456789abcdef0123456789abcdef'
        params=resolve(data_link(self.session,'panel-11','traceID'),self.values,dict(self.row,traceID=trace_id))
        pane=json.loads(params['panes'][0])['trace']
        self.assertEqual(pane['queries'][0]['query'], trace_id)
        self.assertEqual(pane['queries'][0]['datasource']['uid'], pane['datasource'])
        self.assertEqual(pane['range'], {'from':'1000','to':'9000'})

    def test_event_link_preserves_investigation_window_and_nanoseconds(self):
        params=resolve(data_link(self.session,'panel-3','activity'),self.values,self.row)
        self.assertEqual(params['var-event_ns'],[self.row['stored_ns']])
        self.assertEqual((params['from'],params['to']),(['1000'],['9000']))

    def test_readable_cell_values_are_not_replaced_by_generic_link_titles(self):
        for dashboard in trial.build():
            for panel in dashboard['spec']['elements'].values():
                for override in panel['spec']['vizConfig']['spec']['fieldConfig']['overrides']:
                    self.assertFalse(any(p['id']=='custom.cellOptions' and p['value'].get('type')=='data-links' for p in override['properties']))

    def test_new_dashboards_request_the_same_default_access_as_grafana_save(self):
        for dashboard in trial.build():
            self.assertEqual(dashboard['metadata']['annotations']['grafana.app/grant-permissions'], 'default')

    def test_native_loki_instant_tables_join_without_a_metric_label(self):
        panel = self.views['spec']['elements']['panel-2']['spec']
        self.assertNotIn('labelsToFields', [t['group'] for t in panel['data']['spec']['transformations']])
        fields = [o['matcher']['options'] for o in panel['vizConfig']['spec']['fieldConfig']['overrides']]
        for name in ['Value #A', 'Value #B', 'Value #C', 'Value #D']:
            self.assertIn(name, fields)
        self.assertTrue(all('"metric"' not in q['spec']['query']['spec']['expr'] for q in panel['data']['spec']['queries']))

    def test_linked_failure_links_use_actual_reducer_field_names(self):
        target = data_link(self.views, 'panel-4', 'activity (first)')
        for name in ['session_id', 'stored_ns', 'window_from', 'window_to']:
            self.assertIn('__data.fields["' + name + ' (first)"]', target)
        panel = self.views['spec']['elements']['panel-4']['spec']
        self.assertTrue(any(p['id']=='custom.hideFrom.viz' and p['value'] is True
            for o in panel['vizConfig']['spec']['fieldConfig']['overrides'] for p in o['properties']))

    def test_transfer_step_tab_counts_journeys_and_links_back_to_its_own_tab(self):
        tabs = [t['spec']['title'] for t in self.views['spec']['layout']['spec']['tabs']]
        self.assertIn('Transfer step', tabs)
        elements = self.views['spec']['elements']
        for id in range(51, 59):
            expr = elements['panel-%d' % id]['spec']['data']['spec']['queries'][0]['spec']['query']['spec']['expr']
            self.assertTrue(expr.startswith('count(') and expr.startswith('count(', 0) and 'sum by (journey)' in expr[:40], expr[:60])
            self.assertTrue(expr.endswith('or vector(0)'))
            self.assertIn('journey!=""', expr)
        self.assertIn(' unless ', elements['panel-56']['spec']['data']['spec']['queries'][0]['spec']['query']['spec']['expr'])
        self.assertIn('>= 2', elements['panel-57']['spec']['data']['spec']['queries'][0]['spec']['query']['spec']['expr'])
        for id, field in [(60, 'activity'), (62, 'event_data_stalled_step')]:
            params = resolve(data_link(self.views, 'panel-%d' % id, field), dict(self.values, journey_id='old'), self.row)
            self.assertEqual(params['var-origin_tab'], ['Transfer-step'])
            self.assertEqual(params['var-session_id'], [self.row['session_id']])
            self.assertEqual(params['var-journey_id'], [''])
            self.assertEqual((params['from'], params['to']), (['3000'], ['5000']))
        funnel = [elements['panel-%d' % id]['spec']['title'] for id in [30, 39, 40, 43, 44, 41, 42]]
        self.assertEqual(funnel, [t + ' · form visits' for t in ['Viewed', 'Started', 'Submitted', 'Wallet prompted', 'Transaction submitted', 'Deposit observed', 'Completion observed']])
        self.assertIn('event_data_transfer_submitted="true"', elements['panel-44']['spec']['data']['spec']['queries'][0]['spec']['query']['spec']['expr'])

    def test_transfer_alerts_use_journey_counts_and_their_own_windows(self):
        alerts_spec = importlib.util.spec_from_file_location('alerts', Path(__file__).parents[1] / 'build-issue-alerts.py')
        alerts = importlib.util.module_from_spec(alerts_spec)
        alerts_spec.loader.exec_module(alerts)
        rules = {r['uid']: r for r in alerts.build()['groups'][0]['rules']}
        trouble = rules['ls-faro-transfer-trouble']
        self.assertEqual(trouble['data'][0]['relativeTimeRange']['from'], 1800)
        self.assertIn('> 4)', trouble['data'][0]['model']['expr'])
        self.assertIn('[30m]', trouble['data'][0]['model']['expr'])
        quiet = rules['ls-faro-no-submissions']
        self.assertEqual(quiet['data'][0]['relativeTimeRange']['from'], 7200)
        self.assertIn('absent_over_time', quiet['data'][0]['model']['expr'])
        for rule in rules.values():
            self.assertTrue(rule['isPaused'])
            # Only regex backreferences may remain; no dashboard variables or Grafana globals.
            self.assertIsNone(re.search(r'\$\{[a-z_]|\$__', rule['data'][0]['model']['expr']))

    def test_normalization_removes_dynamic_values_but_preserves_short_status_codes(self):
        def normalize(value):
            value = value.strip()
            for pattern, replacement in trial.NORMALIZATIONS:
                value = re.sub(pattern, lambda match: re.sub(r'\$\{(\d+)\}',
                    lambda ref: match.group(int(ref[1])) or '', replacement), value)
            return value
        self.assertEqual(normalize('Failed amount 12 at 0x1234567890abcdef\nArguments: a'),
            normalize('Failed amount 99 at 0xabcdef1234567890\nArguments: b'))
        self.assertNotEqual(normalize('HTTP 400'), normalize('HTTP 500'))
        self.assertNotEqual(normalize('HTTP request failed.'), normalize('Missing or invalid parameters.'))


if __name__ == '__main__': unittest.main()
