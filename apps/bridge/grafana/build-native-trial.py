"""Build the development-only native Grafana v2 usability trial (no network calls)."""
import json
from pathlib import Path
from urllib.parse import quote

OUT = Path(__file__).parent
DS = 'P8E80F9AEF21F6940'
UIDS = {name: 'layerswap-faro-trial-' + ('home' if name == 'views' else name) for name in ['views', 'issue', 'session', 'event']}


def variable(name, value='', label=None, visible=False):
    choices = {'category': ['All', 'User-impacting', 'Diagnostics', 'Unclassified'],
        'test_errors': ['Include', 'Exclude', 'Only']}
    if name in choices:
        return {'kind': 'CustomVariable', 'spec': {'name': name, 'label': label,
            'query': ','.join(choices[name]), 'current': {'text': value, 'value': value},
            'options': [{'text': option, 'value': option, 'selected': option == value} for option in choices[name]],
            'multi': False, 'includeAll': False, 'allowCustomValue': False,
            'hide': 'dontHide' if visible else 'hideVariable', 'skipUrlSync': False,
            'description': 'Filters the Issues list and chart.' if name == 'category' else 'Known controlled test errors only; does not infer tests from release or environment.'}}
    return {'kind': 'TextVariable', 'spec': {'name': name, 'label': label or name,
        'query': value, 'current': {'text': value, 'value': value},
        'hide': 'dontHide' if visible else 'hideVariable', 'skipUrlSync': False}}


VALUES = {'application': 'layerswap-frontend', 'deployment': '', 'release': '',
    'category': 'All', 'test_errors': 'Include', 'selected_category': '', 'selected_test': '',
    'search': '', 'error_marker': '', 'group_key': '', 'error_type': '', 'session_id': '',
    'journey_id': '', 'event_ns': '', 'origin_tab': 'Issues', 'return_from': '', 'return_to': '', 'return_release': '',
    'route': '', 'browser': '', 'mobile': '', 'form_mode': '', 'flow_id': ''}


def decoded(name):
    # Percent encoding makes arbitrary input safe inside a LogQL backtick literal.
    # Grafana's scalar :doublequote formatter does not escape all LogQL characters.
    result = (' | label_format needle_' + name + '=`${' + name + ':percentencode}`'
        ' | label_format needle_' + name + '=`{{ urldecode .needle_' + name + ' }}`')
    if name == 'event_ns':
        result += ' | label_format needle_event_ns=`{{ if .needle_event_ns }}ns:{{ .needle_event_ns | trimPrefix "ns:" }}{{ end }}`'
    return result


def equal(field, name, optional=False):
    expression = '{{ ' + ('or (eq .needle_' + name + ' "") ' if optional else '') + '(eq .' + field + ' .needle_' + name + ') }}'
    return decoded(name) + ' | label_format matched=`' + expression + '` | matched="true"'


BASE = '{source="faro"} | logfmt | __error__=""'
for name, field in [('application', 'app_name'), ('release', 'app_version')]:
    BASE += equal(field, name, optional=name == 'release')
# Older records have no deployment identity. Keep them in the default scope;
# never infer production/local from API mode, release, or a recorded page URL.
BASE += ' | label_format deployment=`{{ if .page_attr_deployment_environment }}{{ .page_attr_deployment_environment }}{{ else }}unknown{{ end }}`'
BASE += equal('deployment', 'deployment', optional=True)
IDENTITY = (' | label_format journey=`{{ if .event_data_journey_id }}{{ .event_data_journey_id }}{{ else }}{{ .session_attr_journey_id }}{{ end }}`'
    ' | label_format swap=`{{ if .event_data_swap_id }}{{ .event_data_swap_id }}{{ else }}{{ .session_attr_swap_id }}{{ end }}`')
STORED = (' | label_format stored_ns=`ns:{{ __timestamp__ | unixEpochNanos }}`'
    ' | label_format window_from=`{{ sub (unixEpochMillis (__timestamp__)) 300000 }}`'
    ' | label_format window_to=`{{ add (unixEpochMillis (__timestamp__)) 300000 }}`')
SUMMARY = (' | label_format activity=`{{ if .value }}{{ .value }}{{ else if .message }}{{ .message }}{{ else if .event_data_message }}{{ .event_data_message }}{{ else if .event_data_reason }}{{ .event_data_reason }}{{ else if .event_data_step }}{{ .event_data_step }}{{ else }}{{ .event_name }}{{ end }}`')
SUMMARY += ' | label_format activity=`{{ regexReplaceAll "(?s)\\n.*" .activity "" | trim | trunc 240 }}`'
# Query-time v2 fingerprint also applies to retained legacy records. Preserve
# short integer status/reason codes. Never group using a truncated display value.
NORMALIZATIONS = [
    (r'(?s)\n.*', ''),
    (r'0x[0-9a-fA-F]{8,}', '<hex>'),
    (r'\b[1-9A-HJ-NP-Za-km-z]{32,64}\b', '<address>'),
    (r'\b(bc1|tb1)[a-z0-9]{20,}\b', '<address>'),
    (r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b', '<id>'),
    (r'https?://[^\s]+', '<url>'),
    (r'(?i)\b(amount|value|balance)([ :=]+)[0-9]+(\.[0-9]+)?\b', '${1}${2}<amount>'),
    (r'\b[0-9]+\.[0-9]+\b', '<amount>'),
    (r'\b[0-9]{6,}\b', '<number>'),
    (r'Could not fetch balance for .* in ', 'Could not fetch balance in '),
    (r'\s+', ' '),
]
BACKGROUND_TYPES = 'BalanceResolverError|BalanceProviderError|MaxPriorityFeePerGasError|FeesPerGasError|GasPriceError|GasProviderError|GasMiscalculation|APIError|SwapCatchupError'
ERRORS = BASE + ' | kind="exception" or event_name="widget_diagnostic"'
ERRORS += (' | label_format type=`{{ if .type }}{{ .type }}{{ else if .event_data_error_type }}{{ .event_data_error_type }}{{ else }}(unknown type){{ end }}`'
    ' | label_format error_message=`{{ if .value }}{{ .value }}{{ else }}{{ .event_data_message }}{{ end }}`'
    ' | label_format category=`{{ if .context_eventType }}{{ .context_eventType }}{{ else }}{{ .event_data_error_category }}{{ end }}`'
    ' | label_format signal=`{{ if or (eq .type "TransactionRejected") (eq .event_data_impact "expected") }}expected{{ else if or (eq .context_impact "diagnostic") (eq .event_data_impact "diagnostic") (eq .category ' + ' '.join(json.dumps(t) for t in BACKGROUND_TYPES.split('|')) + ') }}diagnostic{{ else }}issue{{ end }}`')
ERRORS += decoded('error_marker') + ' | label_format matched=`{{ or (contains (lower .needle_error_marker) (lower .error_message)) (contains (lower .needle_error_marker) (lower .type)) }}` | matched="true"'
ERRORS += ' | label_format normalized=`{{ .error_message | trim }}`'
for pattern, replacement in NORMALIZATIONS:
    ERRORS += ' | label_format normalized=`{{ regexReplaceAll ' + json.dumps(pattern) + ' .normalized ' + json.dumps(replacement) + ' }}`'
ERRORS += (' | label_format group_key=`{{ printf "v2:%s:%s" .type .normalized }}`'
    ' | label_format summary=`{{ .normalized | trim | trunc 180 }}`'
    ' | label_format release=`{{ if .app_version }}{{ .app_version }}{{ else }}(unknown){{ end }}`')
ERRORS += (' | label_format impact_category=`{{ if or (eq .context_impact "user") (eq .event_data_impact "user") }}User-impacting{{ else if eq .signal "diagnostic" }}Diagnostics{{ else }}Unclassified{{ end }}`'
    ' | label_format test_record=`{{ if or (eq .type "controlled_test") (hasPrefix "FARO_CONTROLLED_" .error_message) }}Yes{{ else }}No{{ end }}`')
ISSUES = ERRORS + ' | signal="issue"'
UNEXPECTED = ERRORS + ' | signal!="expected"' + decoded('test_errors')
UNEXPECTED += ' | label_format matched=`{{ or (eq .needle_test_errors "Include") (and (eq .needle_test_errors "Exclude") (eq .test_record "No")) (and (eq .needle_test_errors "Only") (eq .test_record "Yes")) }}` | matched="true"'
OVERVIEW = UNEXPECTED + decoded('category') + ' | label_format matched=`{{ or (eq .needle_category "All") (eq .needle_category .impact_category) }}` | matched="true"'
DIAGNOSTICS = UNEXPECTED + ' | impact_category="Diagnostics"'
SELECTED_GROUP = ERRORS + equal('group_key', 'group_key') + equal('type', 'error_type') + equal('impact_category', 'selected_category', optional=True) + equal('test_record', 'selected_test', optional=True)
FAILURE_FILTER = ' | event_name="swap_lifecycle" | event_data_outcome="failed" | event_data_step!="flow_error"'
# Transfer-step selectors. Journeys are counted by identity, never by record
# volume, and a missing later step is "not observed", not proof of abandonment.
LIFECYCLE = ' | event_name="swap_lifecycle"'
TRANSFER_REACHED = LIFECYCLE + ' | event_data_step="awaiting_wallet_action"'
TRANSFER_PROMPTED = LIFECYCLE + ' | event_data_step="wallet_prompt_opened"'
TRANSFER_SUBMITTED = LIFECYCLE + ' | event_data_step=~"transaction_submitted|gasless_authorization_submitted"'
TRANSFER_BLOCKED = LIFECYCLE + ' | event_data_step="transfer_blocked"'
TRANSFER_FAILED = LIFECYCLE + ' | event_data_outcome="failed" | event_data_step=~"wallet_action_failed|network_switch_failed|wallet_connection_failed"'
TRANSFER_REJECTED = LIFECYCLE + ' | event_data_outcome="rejected" | event_data_step=~"wallet_action_rejected|network_switch_rejected|wallet_connection_failed"'
TRANSFER_TROUBLE = LIFECYCLE + ' | event_data_step=~"transfer_blocked|wallet_action_failed|network_switch_failed|wallet_connection_failed" | event_data_outcome=~"blocked|failed"'
TRANSFER_ACTIVITY = LIFECYCLE + ' | event_data_step=~"wallet_prompt_opened|transfer_blocked|wallet_action_failed|wallet_action_rejected|network_switch_failed|network_switch_rejected|wallet_connection_failed|transaction_submitted|gasless_authorization_submitted"'
STALLED = LIFECYCLE + ' | event_data_step="suspected_stall"'


def journey_set(selector, base=None, window='$__range'):
    """One series per journey that has at least one matching record."""
    return 'sum by (journey) (count_over_time(' + (BASE if base is None else base) + IDENTITY + selector + ' | journey!="" | keep journey [' + window + ']))'
SESSION = BASE + equal('session_id', 'session_id') + ' | session_id!=""' + IDENTITY + equal('journey', 'journey_id', optional=True) + equal('event_data_flow_id', 'flow_id', optional=True)
EVENT = BASE + equal('session_id', 'session_id') + ' | session_id!=""' + STORED + equal('stored_ns', 'event_ns')


def url(destination, *, tab=None, updates=None, window=False, return_range=False):
    params = {k: '${' + k + ':percentencode}' for k in VALUES}
    if updates:
        params.update(updates)
    start, end = '${__from}', '${__to}'
    if window:
        start, end = field('window_from'), field('window_to')
    if return_range:
        start, end = '${return_from:percentencode}', '${return_to:percentencode}'
    parts = ['orgId=1', 'from=' + start, 'to=' + end]
    if tab:
        parts.append('dtab=' + tab)
    parts.extend('var-' + k + '=' + v for k, v in params.items())
    return '/d/' + UIDS[destination] + '?' + '&'.join(parts)


def field(name):
    return '${__data.fields["' + name + '"]:percentencode}'


def link(title, target):
    return {'title': title, 'url': target, 'targetBlank': False}


def transform(group, options):
    return {'kind': 'Transformation', 'group': group, 'spec': {'options': options}}


def query(expr, instant=False, limit=1000):
    return {'kind': 'PanelQuery', 'spec': {'refId': 'A', 'hidden': False, 'query': {
        'kind': 'DataQuery', 'group': 'loki', 'version': 'v0', 'datasource': {'name': DS},
        'spec': {'expr': expr, 'queryType': 'instant' if instant else 'range',
            'instant': instant, 'range': not instant, 'direction': 'backward',
            'maxLines': limit, 'editorMode': 'code'}}}}


def panel(id, title, kind, expr=None, *, description='', options=None, transformations=None, overrides=None, instant=False, limit=1000):
    return {'kind': 'Panel', 'spec': {'id': id, 'title': title, 'description': description, 'links': [],
        'data': {'kind': 'QueryGroup', 'spec': {'queries': [query(expr, instant, limit)] if expr else [],
            'transformations': transformations or [], 'queryOptions': {}}},
        'vizConfig': {'kind': 'VizConfig', 'group': kind, 'version': '13.1.3', 'spec': {
            'options': options or {}, 'fieldConfig': {'defaults': {'noValue': '—'}, 'overrides': overrides or []}}}}}


def text_panel(id, title, content):
    return panel(id, title, 'text', options={'mode': 'markdown', 'content': content})


def table(id, title, expr, columns, *, links=None, hidden=(), instant=False, limit=1000, description='', sort='timestamp', desc=False):
    overrides = []
    for name, label in columns:
        props = [{'id': 'displayName', 'value': label}]
        if name in (links or {}):
            props.append({'id': 'links', 'value': [links[name]]})
        if name in ['activity', 'summary', 'event_data_url_full']:
            props.extend([{'id': 'custom.wrapText', 'value': True}, {'id': 'custom.width', 'value': 480}, {'id': 'custom.inspect', 'value': True}])
        if name == 'timestamp': props.append({'id': 'custom.width', 'value': 220})
        overrides.append({'matcher': {'id': 'byName', 'options': name}, 'properties': props})
    for name in hidden:
        overrides.append({'matcher': {'id': 'byName', 'options': name}, 'properties': [{'id': 'custom.hideFrom.viz', 'value': True}]})
    if instant:
        transforms = [transform('labelsToFields', {'mode': 'columns'}), transform('merge', {})]
    else:
        # Loki already returns a parsed object per row. Avoid Go printf %q display JSON.
        transforms = [transform('extractFields', {'source': 'labels', 'format': 'json', 'replace': True, 'keepTime': False})]
    transforms.append(transform('organize', {'excludeByName': {'Time': True}, 'indexByName': {name: i for i, name in enumerate([n for n, _ in columns] + list(hidden))}}))
    if sort: transforms.append(transform('sortBy', {'sort': [{'field': sort, 'desc': desc}]}))
    return panel(id, title, 'table', expr, instant=instant, limit=limit, description=description,
        options={'showHeader': True, 'cellHeight': 'md', 'enablePagination': True}, transformations=transforms, overrides=overrides)


def records(expr, fields):
    return expr + STORED + SUMMARY + ' | keep ' + ', '.join(dict.fromkeys(fields + ['stored_ns', 'window_from', 'window_to', 'session_id', 'journey', 'kind']))


def collapse_linked_failures(result):
    # Keep the full legacy line in its key: never merge old records merely for
    # sharing a session/time. New observations collapse only with an explicit ID.
    data = result['spec']['data']['spec']
    expression = data['queries'][0]['spec']['query']['spec']['expr']
    marker = ' | keep '
    before, kept = expression.rsplit(marker, 1)
    expression = before + ' | label_format incident=`{{ if .event_data_occurrence_id }}{{ .session_id }}:{{ .event_data_occurrence_id }}{{ else }}legacy:{{ .stored_ns }}:{{ __line__ }}{{ end }}`' + marker + kept + ', incident'
    data['queries'][0]['spec']['query']['spec']['expr'] = expression
    fields = {name.strip(): {'operation':'aggregate','aggregations':['first']} for name in kept.split(',')}
    fields['incident'] = {'operation':'groupby','aggregations':[]}
    # Grafana reducers change actual names. Cosmetic regex renaming only changes
    # display names, so data links must explicitly address the aggregate fields.
    for transformation in data['transformations']:
        options = transformation['spec']['options']
        if transformation['group'] == 'organize':
            options['indexByName'] = {name + ' (first)': index for name, index in options['indexByName'].items()}
        if transformation['group'] == 'sortBy':
            for sort in options['sort']: sort['field'] += ' (first)'
    for override in result['spec']['vizConfig']['spec']['fieldConfig']['overrides']:
        override['matcher']['options'] += ' (first)'
        for prop in override['properties']:
            if prop['id'] == 'links':
                for item in prop['value']:
                    for name in fields:
                        item['url'] = item['url'].replace('__data.fields["' + name + '"]', '__data.fields["' + name + ' (first)"]')
    data['transformations'][1:1] = [transform('groupBy',{'fields':fields})]
    result['spec']['vizConfig']['spec']['fieldConfig']['overrides'].append({'matcher':{'id':'byName','options':'incident'},'properties':[{'id':'custom.hideFrom.viz','value':True}]})
    return result


def triage_table(id, title, source, target):
    labels = 'group_key, type, summary, release, impact_category, test_record'
    counts = 'sum by (' + labels + ') (count_over_time(' + source + ' | keep ' + labels + ' [$__range]))'
    sessions = 'count by (' + labels + ') (sum by (' + labels + ', session_id) (count_over_time(' + source + ' | session_id!="" | keep ' + labels + ', session_id [$__range])))'
    seen = source + ' | label_format seen_ms=`{{ __timestamp__ | unixEpochMillis }}` | keep ' + labels + ', seen_ms | unwrap seen_ms | __error__="" [$__range]'
    expressions = {'Records': counts, 'Sessions': sessions,
        'First seen': 'min by (' + labels + ') (min_over_time(' + seen + '))',
        'Last seen': 'max by (' + labels + ') (max_over_time(' + seen + '))'}
    result = table(id, title, counts,
        [('summary','Error summary'),('impact_category','Category'),('test_record','Test'),('release','Release'),('Value #A','Records'),('Value #B','Affected sessions'),('Value #C','First seen'),('Value #D','Last seen')],
        hidden=['group_key','type'], links={'summary':link('See occurrences', target)}, instant=True, sort='Value #D', desc=True,
        description='All unexpected errors are included by default. Expected wallet declines remain in session timelines. Category is reported impact or a diagnostic category, not proof of harmlessness; absent impact is Unclassified. Test marks known controlled errors. Groups use type + normalized heading, per release/category/test status. Counts are observations, not unique incidents. First/last seen and affected sessions apply to the selected range. Missing session IDs are not counted. Assignment and resolution are not tracked.')
    widths = {'impact_category':120, 'test_record':60, 'release':80, 'Value #A':70, 'Value #B':95, 'Value #C':155, 'Value #D':155}
    result['spec']['vizConfig']['spec']['fieldConfig']['defaults']['custom'] = {'minWidth':60,'wrapHeaderText':True}
    for override in result['spec']['vizConfig']['spec']['fieldConfig']['overrides']:
        name = override['matcher']['options']
        if name == 'summary':
            override['properties'] = [p for p in override['properties'] if p['id']!='custom.width']
            override['properties'].append({'id':'custom.minWidth','value':240})
        if name in widths:
            override['properties'] = [p for p in override['properties'] if p['id']!='custom.width']
            override['properties'].append({'id':'custom.width','value':widths[name]})
            if name in ['impact_category','release']: override['properties'].append({'id':'custom.wrapText','value':True})
    queries = []
    for index, (metric, expression) in enumerate(expressions.items()):
        q = query(expression, True)
        q['spec']['refId'] = chr(65 + index)
        queries.append(q)
    result['spec']['data']['spec']['queries'] = queries
    result['spec']['data']['spec']['transformations'][0:1] = []
    for name in ['Value #C', 'Value #D']:
        result['spec']['vizConfig']['spec']['fieldConfig']['overrides'].append({'matcher':{'id':'byName','options':name},'properties':[{'id':'unit','value':'dateTimeAsIso'}]})
    return result


def aggregate(source, fields):
    return 'sum by (' + fields + ') (count_over_time(' + source + ' | keep ' + fields + ' [$__range]))'


def metric_table(id, title, expression, fields, description):
    result = table(id, title, expression, fields, instant=True, sort='Value', desc=True, description=description)
    # Current Loki instant adapter returns native table columns directly.
    result['spec']['data']['spec']['transformations'] = [t for t in result['spec']['data']['spec']['transformations'] if t['group'] != 'labelsToFields']
    return result


def stat(id, title, expression, description, unit=None):
    result = panel(id,title,'stat',expression,instant=True,description=description,
        options={'reduceOptions':{'calcs':['lastNotNull'],'fields':'','values':False},'colorMode':'none','graphMode':'none',
            'textMode':'value','justifyMode':'left','text':{'valueSize':18}})
    defaults = result['spec']['vizConfig']['spec']['fieldConfig']['defaults']
    defaults['noValue'] = 'No telemetry'
    if unit: defaults['unit'] = unit
    return result


def grid(items):
    return {'kind': 'GridLayout', 'spec': {'items': [{'kind': 'GridLayoutItem', 'spec': {
        'element': {'kind': 'ElementReference', 'name': 'panel-' + str(id)}, 'x': x, 'y': y, 'width': w, 'height': h}}
        for id, x, y, w, h in items]}}


def tabs(entries):
    return {'kind': 'TabsLayout', 'spec': {'tabs': [{'kind': 'TabsLayoutTab', 'spec': {'title': title, 'layout': layout}} for title, layout in entries]}}


def dashboard(name, title, panels, layout, visible, nav):
    labels = {'application': 'Application', 'release': 'Release (blank = all)', 'category': 'Issues category', 'test_errors': 'Test errors', 'search': 'Wallet / swap / session / journey', 'error_marker': 'Message / type contains', 'journey_id': 'Journey (blank = all)'}
    labels.update({'deployment': 'Deployment (blank = all)', 'route': 'Page template (blank = all)', 'browser': 'Browser (blank = all)', 'mobile': 'Mobile: true / false / blank', 'form_mode': 'Form mode (blank = all)', 'flow_id': 'Form visit (blank = all)'})
    return {'apiVersion': 'dashboard.grafana.app/v2', 'kind': 'Dashboard', 'metadata': {'name': UIDS[name], 'annotations': {'grafana.app/folder': '', 'grafana.app/grant-permissions': 'default'}},
        'spec': {'title': title + ' · Native trial', 'description': 'Development telemetry. Usability trial; not a production health dashboard.',
            'tags': ['layerswap', 'faro', 'development', 'native-trial'], 'editable': True, 'annotations': [], 'cursorSync': 'Off',
            'liveNow': False, 'preload': False, 'timeSettings': {'timezone': 'utc', 'from': 'now-7d', 'to': 'now', 'autoRefresh': '', 'autoRefreshIntervals': ['1m', '5m', '15m'], 'hideTimepicker': False, 'fiscalYearStartMonth': 0},
            'variables': [variable(k, v, labels.get(k), k in visible) for k,v in VALUES.items()],
            'links': [dict(item, type='link', asDropdown=False, includeVars=False, keepTime=False, tags=[], icon='external link', tooltip='') for item in nav],
            'elements': {'panel-' + str(p['spec']['id']): p for p in panels}, 'layout': layout}}


def build():
    # Entry links carry their origin explicitly so back navigation restores the correct tab.
    def enter(origin, focus=True):
        return url('session', window=focus, updates={'session_id': field('session_id'), 'journey_id': '', 'flow_id': '', 'event_ns': field('stored_ns') if focus else '',
            'origin_tab': {'recent-failures':'Recent-failures','session-lookup':'Session-lookup'}.get(origin, origin), 'return_from': '${__from}', 'return_to': '${__to}', 'return_release':'${release:percentencode}'})

    issue_url = url('issue', updates={'group_key': field('group_key'), 'error_type': field('type'), 'selected_category':field('impact_category'), 'selected_test':field('test_record'), 'release':field('release'), 'return_release':'${release:percentencode}', 'origin_tab': 'Issues', 'return_from': '${__from}', 'return_to': '${__to}', 'session_id': '', 'journey_id': '', 'flow_id': '', 'event_ns': ''})
    grouping = triage_table(2, 'Unexpected errors · ${category} · tests: ${test_errors}', OVERVIEW, issue_url)
    diagnostics = triage_table(15, 'Background diagnostics · normalized groups by release', DIAGNOSTICS,
        issue_url.replace('var-origin_tab=Issues', 'var-origin_tab=Diagnostics'))
    last = stat(11,'Latest data received · selected range',
        'max(max_over_time(' + BASE + ' | label_format seen_ms=`{{ __timestamp__ | unixEpochMillis }}` | keep seen_ms | unwrap seen_ms | __error__="" [$__range]))',
        'Latest stored timestamp within the selected range and application/deployment/release scope. Independent of category, test and message filters. Historical coverage, not live collector status. Missing data means visibility is unknown.', 'dateTimeAsIso')
    volume = stat(12,'Observed sessions · selected range',
        'count(sum by (session_id) (count_over_time(' + BASE + ' | session_id!="" | keep session_id [$__range])))',
        'Sessions with any stored telemetry. Not total visitors: sampling and delivery loss still apply.')
    trend = panel(13,'Issue observations by release · hourly', 'timeseries',
        'sum by (release) (count_over_time(' + OVERVIEW + ' | keep release [1h]))',
        description='Rolling hourly observation count. Empty buckets mean no observations; zero errors alone does not establish health.',
        options={'legend':{'displayMode':'list','placement':'bottom','showLegend':True},'tooltip':{'mode':'multi'}})
    event_columns = [('timestamp','Client time'),('activity','What happened'),('event_data_step','Step'),('event_data_outcome','Outcome')]
    recent_fields = [n for n,_ in event_columns] + ['type']
    failure_search = decoded('error_marker') + ' | label_format matched=`{{ or (contains (lower .needle_error_marker) (lower .event_data_reason)) (contains (lower .needle_error_marker) (lower .event_data_reason_code)) }}` | matched="true"'
    recent = collapse_linked_failures(table(4, 'Explicit operation failures · newest 100 observations', records(BASE + FAILURE_FILTER + failure_search + IDENTITY, recent_fields + ['event_data_occurrence_id']), event_columns + [('event_data_occurrence_id','Occurrence')],
        hidden=['stored_ns','window_from','window_to','session_id','journey','kind'], links={'activity':link('Investigate this occurrence',enter('recent-failures'))}, limit=100, desc=True))
    journeys_columns = [('timestamp','Client time'),('event_data_step','Activity'),('event_data_outcome','Outcome'),('event_data_attempt','Prompt count'),('journey','Journey')]
    journeys = table(6, 'Journey activity · newest 1,000 events', records(BASE + ' | event_name="swap_lifecycle" | session_id!=""' + IDENTITY, [n for n,_ in journeys_columns]), journeys_columns,
        hidden=['stored_ns','window_from','window_to','session_id','kind'], links={'journey':link('Inspect this journey',url('session',window=True,updates={'session_id':field('session_id'),'journey_id':field('journey'),'flow_id':'','event_ns':field('stored_ns'),'origin_tab':'Journeys','return_from':'${__from}','return_to':'${__to}','return_release':'${release:percentencode}'}))}, desc=True,
        description='Observed lifecycle events, not one row per journey or authoritative swap state. Narrow the range if the table reaches 1,000.')
    lookup = BASE + IDENTITY + decoded('search') + ' | needle_search!="" | session_id!=""'
    lookup += ' | label_format matched=`{{ $found := or (eq .session_id .needle_search) (eq .journey .needle_search) (eq .swap .needle_search) }}{{ $needle := .needle_search }}{{ if .session_attr_connected_wallets }}{{ range $wallet := fromJson .session_attr_connected_wallets }}{{ if eq $wallet.wallet_address $needle }}{{ $found = true }}{{ end }}{{ end }}{{ end }}{{ $found }}` | __error__="" | matched="true"'
    matches = table(8,'Matching sessions','sum by (session_id) (count_over_time(' + lookup + ' | keep session_id [$__range]))', [('session_id','Session'),('Value','Matching records')], instant=True,
        links={'session_id':link('Open session',enter('session-lookup',False))}, sort='Value',desc=True,description='Exact, case-sensitive wallet/swap/session/journey match. Searches historical wallet records. Blank search returns no rows; independent of error filters.')
    transfer_panels, transfer_grid = transfer_step_tab(enter)
    views = dashboard('views','Layerswap investigations',[
        grouping,last,volume,trend,diagnostics,*transfer_panels,
        text_panel(16,'Diagnostics','Handled balance, gas, catch-up and API observations. These may explain a failure but do not independently prove a user operation failed. Select a group for the original messages.'),
        text_panel(3,'Recent failures','Explicit failed operations. Observations with the same occurrence ID share a row; legacy records cannot be reliably deduplicated. Open a row for surrounding activity, including related exceptions and diagnostics. Counts are not failed swaps. Search matches the reason/message and reason code.'),recent,
        text_panel(5,'Journeys','Inspect activity even when no exception was recorded. Each row is an observed event; multiple rows can belong to the same journey.'),journeys,
        text_panel(7,'Session lookup','Enter a wallet address, swap ID, session ID or journey ID in the search above. Clear the input to start another lookup. No rows means no matching recorded association in this range.'),matches],
        tabs([('Issues',grid([(11,0,0,16,2),(12,16,0,8,2),(2,0,2,24,12),(13,0,14,24,7)]))] + [(name,grid([(a,0,0,24,3),(b,0,3,24,16)])) for name,a,b in [('Recent failures',3,4)]]
            + [('Transfer step',transfer_grid)] + [(name,grid([(a,0,0,24,3),(b,0,3,24,16)])) for name,a,b in [('Journeys',5,6),('Session lookup',7,8),('Diagnostics',16,15)]]),
        ['application','deployment','release','category','test_errors','search','error_marker'],[])
    occurrences = table(2,'Occurrences · newest 100', records(SELECTED_GROUP + IDENTITY, recent_fields + ['app_version']), event_columns + [('type','Type'),('app_version','Release')],
        hidden=['stored_ns','window_from','window_to','session_id','journey','kind'], links={'activity':link('Open surrounding timeline',url('session',window=True,updates={'session_id':field('session_id'),'journey_id':'','flow_id':'','event_ns':field('stored_ns')}))},limit=100,desc=True)
    back_results = link('← Back to results',url('views',tab='${origin_tab:percentencode}',return_range=True,updates={'release':'${return_release:percentencode}'}))
    issue_trend = panel(3,'Selected group · hourly observations by release','timeseries',
        'sum by (release) (count_over_time(' + SELECTED_GROUP + ' | keep release [1h]))',
        description='Rolling hourly counts for this normalized group. Clear Release to compare releases. Absence of observations is not resolved state.',
        options={'legend':{'displayMode':'list','placement':'bottom','showLegend':True},'tooltip':{'mode':'multi'}})
    issue = dashboard('issue','Error occurrences',[text_panel(1,'Selected error type · ${error_type}','Choose an occurrence to inspect its original message and surrounding activity. The chart shows this group over time; clear Release to compare versions. Resolved/assigned state is not tracked.'),occurrences,issue_trend], grid([(1,0,0,24,3),(3,0,3,24,7),(2,0,10,24,16)]),['application','deployment','release'],[back_results])
    event_target = url('event',updates={'event_ns':field('stored_ns')})
    shared_hidden = ['stored_ns','window_from','window_to','session_id','journey','kind']
    timeline_columns = event_columns + [('event_data_attempt','Prompt count'),('occurrence','Occurrence'),('selected','Selected')]
    timeline_expr = SESSION + STORED + ' | label_format occurrence=`{{ if .event_data_occurrence_id }}{{ .event_data_occurrence_id }}{{ else }}{{ .context_occurrence_id }}{{ end }}`' + decoded('event_ns') + ' | label_format selected=`{{ if eq .stored_ns .needle_event_ns }}Selected{{ end }}`'
    timeline = table(3,'Timeline · newest 1,000 records, shown in order',records(timeline_expr,[n for n,_ in timeline_columns]),timeline_columns,
        hidden=shared_hidden,links={'activity':link('Inspect event details',event_target)})
    count = panel(2,'Records in this window · table limit 1,000','stat','sum(count_over_time(' + SESSION + ' | keep session_id [$__range])) or vector(0)',instant=True,
        description='If the count exceeds 1,000, the timeline omits older records. Narrow the time range. Table pagination does not fetch more records.',
        options={'reduceOptions':{'calcs':['lastNotNull'],'fields':'','values':False},'colorMode':'value','graphMode':'none'})
    count['spec']['vizConfig']['spec']['fieldConfig']['defaults']['thresholds']={'mode':'absolute','steps':[{'color':'blue','value':None},{'color':'orange','value':1000}]}
    selected = panel(4,'Selected occurrence · expand for raw details','logs',EVENT,limit=20,options={'showTime':True,'showLabels':False,'showCommonLabels':False,'wrapLogMessage':True,'enableLogDetails':True,'sortOrder':'Ascending','dedupStrategy':'none'})
    failures = collapse_linked_failures(table(6,'Explicit operation failures · newest 1,000 observations',records(SESSION + FAILURE_FILTER,recent_fields + ['event_data_occurrence_id']),event_columns+[('event_data_occurrence_id','Occurrence')],hidden=shared_hidden,links={'activity':link('Inspect event',event_target)},desc=True))
    request_columns=[('timestamp','Client time'),('event_data_http_request_method','Method'),('event_data_url_full','URL'),('event_data_http_response_status_code','Status')]
    requests = table(8,'Recorded HTTP requests · newest 1,000',records(SESSION+' | event_data_http_request_method!=""',[n for n,_ in request_columns]),request_columns,
        hidden=shared_hidden,links={'event_data_url_full':link('Inspect request event',event_target)},desc=True,
        description='Recorded request mirrors only. Absence is not proof no request occurred. Inspect raw event for other recorded timing fields.')
    context_columns=[('timestamp','Client time'),('journey','Journey'),('swap','Swap'),('session_attr_connected_wallets','Wallet context'),('browser_name','Browser')]
    context = table(10,'Historical context snapshots · newest 20',records(SESSION,[n for n,_ in context_columns]),context_columns,
        hidden=['stored_ns','window_from','window_to','session_id','kind'],links={'timestamp':link('Inspect snapshot',event_target)},limit=20,desc=True,
        description='Values belong to each record; session attributes are not automatically the context or cause of a different event.')
    session = dashboard('session','Session investigation',[
        text_panel(1,'Session · ${session_id}','The time picker uses stored time; rows show browser event time. **Original session range** restores the results range. Clear Journey to see all journeys in this session.'),count,timeline,selected,
        text_panel(5,'Failures','Explicit failed lifecycle outcomes, excluding generic flow_error diagnostics. Exception/API observations and expected wallet declines remain in Timeline. This is not a count of failed swaps. Legacy rows lack causal IDs.'),failures,
        text_panel(7,'Requests','Recorded browser request events for this session and journey. Select a URL for its event details.'),requests,
        text_panel(9,'Context','Historical snapshots, newest first. Missing fields remain unavailable.'),context],
        tabs([('Timeline',grid([(1,0,0,19,3),(2,19,0,5,3),(4,0,3,24,5),(3,0,8,24,16)])),('Failures',grid([(5,0,0,24,3),(6,0,3,24,16)])),('Requests',grid([(7,0,0,24,3),(8,0,3,24,16)])),('Context',grid([(9,0,0,24,3),(10,0,3,24,16)]))]),
        ['journey_id'],[back_results,link('Original session range',url('session',return_range=True)),link('All activity in this session',url('session',updates={'journey_id':'','flow_id':''}))])
    event = dashboard('event','Event details',[
        text_panel(1,'Session · ${session_id}','Expand the record for exact stored fields and stack, where available. Source-map attribution is unverified; a stack may still refer to minified code. Use the panel menu → Explore for deeper log inspection. Multiple records may share a stored timestamp.'),
        dict(selected, spec=dict(selected['spec'],id=2,title='Stored event'))],grid([(1,0,0,24,3),(2,0,3,24,20)]),[],[link('← Back to timeline',url('session')),back_results])
    add_experience_views(views, session)
    return [views,issue,session,event]


def transfer_step_tab(enter):
    """Did users who reached the send button get a transaction out, and if not, what stopped them?"""
    reached = journey_set(TRANSFER_REACHED)
    submitted = journey_set(TRANSFER_SUBMITTED)
    rejected = journey_set(TRANSFER_REJECTED)
    count_of = lambda expression: 'count(' + expression + ') or vector(0)'
    journeys_note = ' Counted by journey, not by record; a journey missing a later step was not observed to reach it, which is not proof of abandonment or backend failure.'
    stats = [
        stat(51, 'Reached transfer step', count_of(reached), 'Journeys that displayed the wallet-transfer step (deposit-address swaps excluded).' + journeys_note),
        stat(52, 'Wallet prompted', count_of(journey_set(TRANSFER_PROMPTED)), 'Journeys where a wallet transaction or signature prompt was opened at least once.' + journeys_note),
        stat(53, 'Transaction submitted', count_of(submitted), 'Journeys with an accepted transaction hash or gasless authorization.' + journeys_note),
        stat(54, 'Blocked', count_of(journey_set(TRANSFER_BLOCKED)), 'Journeys that saw a blocking message instead of the send button (RPC health, balance, gas, route or account requirements). Recovery shows as a later submission in the same journey.' + journeys_note),
        stat(55, 'Failed', count_of(journey_set(TRANSFER_FAILED)), 'Journeys with a failed wallet connection, network switch, transfer or gasless authorization. User declines are not failures.' + journeys_note),
        stat(56, 'Declined, never submitted', count_of(rejected + ' unless ' + submitted), 'Journeys where the user declined a wallet prompt and no submission followed in range. Repeated declines usually mean something in the prompt looked wrong.' + journeys_note),
        stat(57, 'Declined 2+ times, never submitted', count_of('(' + rejected + ' >= 2) unless ' + submitted), 'Journeys with at least two declines and no submission in range.' + journeys_note),
        stat(58, 'No wallet-step activity', count_of(reached + ' unless ' + journey_set(TRANSFER_ACTIVITY)), 'Reached the transfer step, then no prompt, block, failure, decline or submission was recorded in range. Includes users still deciding and users who left.' + journeys_note),
    ]
    trouble = BASE + IDENTITY + TRANSFER_TROUBLE + ' | journey!=""'
    reason_fields = 'event_data_step, event_data_reason_code, event_data_source_network, event_data_provider'
    reasons = metric_table(59, 'Blocked and failed transfers · journeys by reason',
        'count by (' + reason_fields + ') (sum by (journey, ' + reason_fields + ') (count_over_time(' + trouble + ' | keep journey, ' + reason_fields + ' [$__range])))',
        [('event_data_step','Step'),('event_data_reason_code','Reason'),('event_data_source_network','Source network'),('event_data_provider','Wallet'),('Value','Journeys')],
        'Distinct journeys per normalized reason. Reason codes are bounded causes; the raw provider code and message are in the event details. Blank wallet means the block happened before a wallet operation.')
    event_columns = [('timestamp','Client time'),('activity','What happened'),('event_data_step','Step'),('event_data_reason_code','Reason'),('event_data_source_network','Source network'),('event_data_provider','Wallet')]
    hidden = ['stored_ns','window_from','window_to','session_id','journey','kind']
    events = table(60, 'Blocked and failed transfers · newest 100', records(trouble, [n for n,_ in event_columns]), event_columns,
        hidden=hidden, links={'activity':link('Investigate this journey', enter('Transfer-step'))}, limit=100, desc=True,
        description='Newest observations with the message shown to the user. Open a row for the surrounding session timeline, requests and context.')
    stalled = BASE + IDENTITY + STALLED + ' | journey!=""'
    stall_fields = 'event_data_stalled_step, event_data_source_network'
    stalls = metric_table(61, 'Suspected stalls · journeys by step',
        'count by (' + stall_fields + ') (sum by (journey, ' + stall_fields + ') (count_over_time(' + stalled + ' | keep journey, ' + stall_fields + ' [$__range])))',
        [('event_data_stalled_step','Stalled at'),('event_data_source_network','Source network'),('Value','Journeys')],
        'Client-side timers: the journey sat on this step longer than its threshold with no later progress. Browser suspension and tab switches also fire these; treat as leads, not confirmed stuck users.')
    stall_columns = [('timestamp','Client time'),('event_data_stalled_step','Stalled at'),('event_data_stall_threshold_ms','Threshold ms'),('event_data_source_network','Source network'),('event_data_provider','Wallet')]
    stall_events = table(62, 'Suspected stalls · newest 100', records(stalled, [n for n,_ in stall_columns]), stall_columns,
        hidden=hidden, links={'event_data_stalled_step':link('Investigate this journey', enter('Transfer-step'))}, limit=100, desc=True,
        description='One record per journey and step when the threshold elapsed. A later submission in the same journey means the user recovered.')
    intro = text_panel(50, 'Transfer step', 'Journeys that reached the send button, and what happened next. **Blocked** covers states that hide the button without an error (unhealthy RPC, balance, gas, route or account requirements); **Failed** covers wallet operations that threw. Select a row to open the session timeline. Counts are journeys in the selected range; a journey can appear in several columns.')
    layout = grid([(50,0,0,24,3)] + [(51 + i, 3 * i, 3, 3, 4) for i in range(8)] + [(59,0,7,24,9),(60,0,16,24,12),(61,0,28,10,9),(62,10,28,14,12)])
    return [intro, *stats, reasons, events, stalls, stall_events], layout


def add_experience_views(views, session):
    """Analytics remains in the existing navigation and shares its investigation URLs."""
    base = BASE + ' | label_format route=`{{ if .event_data_route }}{{ .event_data_route }}{{ else if .view_name }}{{ .view_name }}{{ else }}(unknown){{ end }}`'
    base += equal('route', 'route', optional=True) + equal('browser_name', 'browser', optional=True) + equal('browser_mobile', 'mobile', optional=True)
    ops = base + ' | event_name="widget_operation" | event_data_duration_ms!=""'
    behavior = base + equal('event_data_form_mode', 'form_mode', optional=True)
    flows = behavior + ' | event_name="widget_flow" | session_id!="" | event_data_flow_id!=""'
    # Count visits that began within this window. Observations at the right edge
    # remain incomplete; no inferred abandonment and no backend settlement claim.
    cohort = flows + ' | event_data_flow_started_ms >= ${__from} | event_data_flow_started_ms <= ${__to} | event_data_flow_elapsed_ms <= 86400000 | __error__=""'
    ids = 'session_id, event_data_flow_id'

    def count_visits(source):
        return 'count(sum by (' + ids + ') (count_over_time(' + source + ' | keep ' + ids + ' [$__range])))'

    def samples(metric, window='$__range'):
        source = base + ' | kind="measurement" | type="web-vitals" | context_id!="" | session_id!="" | value_' + metric + '!=""'
        # Last observation per metric ID, rather than weighting repeated updates.
        return ('last_over_time(' + source + ' | keep session_id, context_id, route, browser_mobile, browser_name, app_version, value_' + metric
            + ' | unwrap value_' + metric + ' | __error__="" [' + window + ']) by (session_id, context_id, route, browser_mobile, browser_name, app_version)')

    panels = []
    for i, metric in enumerate(['lcp', 'inp', 'cls', 'fcp', 'ttfb']):
        p = stat(20 + i, metric.upper() + ' · p75', samples(metric),
            'Latest stored observation per session/metric ID in range; Grafana p75 uses the nearest observed index. A metric may be absent until interaction or page exit. Browser measurement, not backend latency.', None if metric == 'cls' else 'ms')
        p['spec']['data']['spec']['transformations'] = [transform('merge', {}), transform('filterFieldsByName', {'include': {'names': ['Value']}})]
        p['spec']['vizConfig']['spec']['options']['reduceOptions'] = {'calcs':['p75'],'fields':'','values':False}
        panels.append(p)
    panels.append(metric_table(25, 'Web Vitals coverage · distinct metric samples',
        'count by (metric) (sum by (metric, session_id, context_id) (count_over_time(' + base + ' | kind="measurement" | type="web-vitals" | context_id!="" | session_id!=""'
        + ' | label_format metric=`{{ if .value_lcp }}LCP{{ else if .value_inp }}INP{{ else if .value_cls }}CLS{{ else if .value_fcp }}FCP{{ else if .value_ttfb }}TTFB{{ end }}`'
        + ' | metric!="" | keep metric, session_id, context_id [$__range])))',
        [('metric','Metric'),('Value','Samples')], 'Sample counts are independent for each metric. Small or absent samples are not evidence of good performance.'))
    trend = panel(26, 'Loading · hourly LCP p75', 'timeseries', samples('lcp', '1h'),
        description='Rolling hourly windows, one latest observation per recorded metric ID.',
        options={'legend':{'displayMode':'list','placement':'bottom','showLegend':True},'tooltip':{'mode':'multi'}},
        transformations=[transform('seriesToRows',{}),transform('groupBy',{'fields':{'Time':{'operation':'groupby','aggregations':[]},'Value':{'operation':'aggregate','aggregations':['p75']}}})])
    trend['spec']['vizConfig']['spec']['fieldConfig']['defaults']['unit'] = 'ms'
    panels.append(trend)
    duration = 'quantile_over_time(0.95, ' + ops + ' | keep event_data_operation, event_data_outcome, event_data_duration_ms | unwrap event_data_duration_ms | __error__="" [$__range]) by (event_data_operation, event_data_outcome)'
    p = metric_table(27, 'Application operations · p95 elapsed time', duration,
        [('event_data_operation','Operation'),('event_data_outcome','Outcome'),('Value','p95 elapsed')],
        'Actual executions, excluding cache hits. Quote request excludes debounce/display delay. Wallet connection, transfer and gasless authorization include user waiting; compare each operation separately. Balance partial results remain Partial.')
    p['spec']['vizConfig']['spec']['fieldConfig']['defaults']['unit'] = 'ms'
    panels.append(p)
    panels.append(metric_table(28, 'Operation sample counts', aggregate(ops, 'event_data_operation, event_data_outcome'),
        [('event_data_operation','Operation'),('event_data_outcome','Outcome'),('Value','Executions')], 'Includes scheduled/background executions. Does not count failed swaps.'))
    hidden = ['stored_ns','window_from','window_to','session_id','journey','kind','event_data_flow_id']
    def investigate(tab, flow=False):
        return url('session', window=True, updates={'session_id':field('session_id'),'journey_id':'','flow_id':field('event_data_flow_id') if flow else '',
            'event_ns':field('stored_ns'),'origin_tab':tab,'return_from':'${__from}','return_to':'${__to}','return_release':'${release:percentencode}'})
    columns = [('timestamp','Client time'),('event_data_operation','Operation'),('event_data_outcome','Outcome'),('event_data_duration_ms','Elapsed ms')]
    panels.append(table(29,'Operation examples · newest 100',records(ops + IDENTITY, [n for n,_ in columns] + ['event_data_flow_id']),columns,
        hidden=hidden,links={'event_data_operation':link('Inspect session',investigate('Performance'))},limit=100,desc=True,
        description='Newest examples, not the slowest 100. Use the session timeline and Requests tab for context.'))
    performance_grid = grid([(20,0,0,5,3),(21,5,0,5,3),(22,10,0,4,3),(23,14,0,5,3),(24,19,0,5,3),
        (25,0,3,7,7),(26,7,3,17,7),(27,0,10,14,9),(28,14,10,10,9),(29,0,19,24,12)])

    stages = [('', 'Viewed'), (' | event_data_form_started="true"','Started'),
        (' | event_data_form_started="true" | event_data_submitted="true"','Submitted'),
        (' | event_data_form_started="true" | event_data_submitted="true" | event_data_transfer_prompted="true"','Wallet prompted'),
        (' | event_data_form_started="true" | event_data_submitted="true" | event_data_transfer_submitted="true"','Transaction submitted'),
        (' | event_data_form_started="true" | event_data_submitted="true" | event_data_deposit_observed="true"','Deposit observed'),
        (' | event_data_form_started="true" | event_data_submitted="true" | event_data_deposit_observed="true" | event_data_completion_observed="true"','Completion observed')]
    funnel_description = 'Unit: one mounted form visit, which can include retries and multiple submissions. Cohort starts in the selected range; progress must also be stored in range and within 24h of opening. New visits near the range end are incomplete. Automatic deposit submission without interaction is excluded from Started onward. Wallet prompted and Transaction submitted apply to wallet-mode visits; deposit-address visits skip them and can still reach Deposit observed. Missing completion is not abandonment or backend failure.'
    # Separate requests stay below the gateway URI limit, including encoded filters.
    for id, (condition, title) in zip([30,39,40,43,44,41,42], stages):
        panels.append(stat(id, title + ' · form visits', count_visits(cohort + condition) + ' or vector(0)', funnel_description))
    # A funnel is a cohort intersection, not a division of unrelated event counts.
    viewed = count_visits(cohort)
    completed = count_visits(cohort + stages[-1][0])
    panels.append(stat(31,'Observed completion / viewed visits', '((' + completed + ') or (0 * ' + viewed + ')) / (' + viewed + ')',
        'Recorded form-visit conversion in the same bounded cohort. New cohorts are incomplete; does not include backend completions after the browser stops reporting.', 'percentunit'))
    panels.append(metric_table(32,'Feature interactions',aggregate(behavior + ' | event_name="widget_interaction"','event_data_action'),
        [('event_data_action','Action'),('Value','Activations')], 'Named user activations. Form editing emits once per visit. No DOM text, typed values, replay or heatmaps.'))
    panels.append(metric_table(33,'Validation encountered',aggregate(flows + ' | event_data_step="validation_shown"','event_data_reason_code'),
        [('event_data_reason_code','Validation'),('Value','Observations')], 'Validation transitions observed after form interaction. Counts are observations, not affected people.'))
    panels.append(metric_table(34,'Routes and deposit methods · submitted visits',
        'count by (event_data_source_network, event_data_destination_network, event_data_deposit_method) (sum by (' + ids + ', event_data_source_network, event_data_destination_network, event_data_deposit_method) (count_over_time(' + cohort + ' | event_data_step="form_submitted" | keep ' + ids + ', event_data_source_network, event_data_destination_network, event_data_deposit_method [$__range])))',
        [('event_data_source_network','Source'),('event_data_destination_network','Destination'),('event_data_deposit_method','Method'),('Value','Visits')],
        'A visit may submit several routes; route totals are not additive unique visits. Includes automatic deposit-address submission.'))
    browser = base + ' | event_name="browser_experience"'
    panels.append(metric_table(35,'Page visits',aggregate(browser + ' | event_data_step="page_viewed"','route'),[('route','Page'),('Value','Views')],
        'Explicit page-template views from the new instrumentation. No reconstruction of historical visits from arbitrary logs.'))
    panels.append(stat(36,'Recorded active time','sum(sum_over_time(' + browser + ' | event_data_step="engagement" | keep event_data_active_ms | unwrap event_data_active_ms | __error__="" [$__range]))',
        'Foreground, focused time; a 30-second idle cutoff. Disjoint intervals flushed every 60s and at page exit. Browser termination can lose the last interval. Page-level, independent of form-mode filter.', 'ms'))
    visit_columns = [('timestamp','Last recorded activity'),('event_data_step','Step'),('event_data_outcome','Outcome'),('event_data_submission_count','Submissions'),('event_data_flow_id','Form visit')]
    visits = table(37,'Form visits · latest activity in newest 1,000 records',records(flows + IDENTITY,[n for n,_ in visit_columns]),visit_columns,
        hidden=['stored_ns','window_from','window_to','session_id','journey','kind'],links={'event_data_flow_id':link('Inspect this form visit',investigate('Behavior',True))},desc=True,
        description='The returned records are grouped by session + visit. Older visits may be omitted at the 1,000-record limit. Last observed state is not authoritative swap state. Clear Form visit in the session to see all logs and requests.')
    fields = {name:{'operation':'aggregate','aggregations':['first']} for name in [n for n,_ in visit_columns] + ['stored_ns','window_from','window_to','session_id','journey','kind']}
    fields['event_data_flow_id'] = {'operation':'groupby','aggregations':[]}
    fields['session_id'] = {'operation':'groupby','aggregations':[]}
    data = visits['spec']['data']['spec']
    # Sort explicitly before first() so the result does not depend on datasource ordering.
    data['transformations'][1:1] = [transform('sortBy',{'sort':[{'field':'timestamp','desc':True}]}),transform('groupBy',{'fields':fields})]
    for t in data['transformations'][3:]:
        if t['group']=='organize': t['spec']['options']['indexByName'] = {k if k in ['session_id','event_data_flow_id'] else k+' (first)':v for k,v in t['spec']['options']['indexByName'].items()}
        if t['group']=='sortBy': t['spec']['options']['sort'][0]['field']='timestamp (first)'
    for override in visits['spec']['vizConfig']['spec']['fieldConfig']['overrides']:
        if override['matcher']['options'] not in ['session_id','event_data_flow_id']: override['matcher']['options']+=' (first)'
        for prop in override['properties']:
            if prop['id']=='links':
                for l in prop['value']:
                    for name in ['stored_ns','window_from','window_to']: l['url']=l['url'].replace('__data.fields["'+name+'"]','__data.fields["'+name+' (first)"]')
    panels.append(visits)
    panels.append(stat(38,'Form records in range', 'sum(count_over_time(' + flows + ' | keep session_id [$__range]))',
        'Latest-activity table uses only the newest 1,000 flow records. A count above that means older visits may be missing.'))
    behavior_grid = grid([(30,0,0,4,4),(39,4,0,3,4),(40,7,0,3,4),(43,10,0,4,4),(44,14,0,4,4),(41,18,0,3,4),(42,21,0,3,4),
        (31,0,4,12,4),(36,12,4,12,4),(32,0,8,12,9),(33,12,8,12,9),
        (34,0,17,14,9),(35,14,17,10,9),(38,0,26,24,3),(37,0,29,24,12)])
    views['spec']['elements'].update({'panel-'+str(p['spec']['id']):p for p in panels})
    views['spec']['layout']['spec']['tabs'].extend(tabs([('Performance',performance_grid),('Behavior',behavior_grid)])['spec']['tabs'])
    for v in views['spec']['variables']:
        if v['spec']['name'] in ['route','browser','mobile','form_mode']: v['spec']['hide']='dontHide'
    for v in session['spec']['variables']:
        if v['spec']['name']=='flow_id': v['spec']['hide']='dontHide'

    # Direct links use the observed Tempo UID, independently of the broken
    # provisioned Loki derived-field reference. Only rows with a trace ID qualify.
    panes = {'trace':{'datasource':'P214B5B846CF3925F','queries':[{'refId':'A','datasource':{'type':'tempo','uid':'P214B5B846CF3925F'},'queryType':'traceql','query':'TRACE_ID'}], 'range':{'from':'RANGE_FROM','to':'RANGE_TO'}}}
    trace_url = '/explore?schemaVersion=1&panes='+quote(json.dumps(panes,separators=(',',':')),safe='')
    trace_url = trace_url.replace('TRACE_ID',field('traceID')).replace('RANGE_FROM','${__from}').replace('RANGE_TO','${__to}')
    trace_panel = table(11,'Recorded traces · open in Tempo',records(SESSION+' | traceID=~"[a-fA-F0-9]{32}"',["timestamp","traceID","event_data_url_full"]),
        [('timestamp','Client time'),('event_data_url_full','Request'),('traceID','Trace')],hidden=['stored_ns','window_from','window_to','session_id','journey','kind'],
        links={'traceID':link('Open trace',trace_url)},description='Exact recorded trace IDs. Nearby errors are contextual; this does not prove they caused a request. Tempo retention is independent of Loki.')
    session['spec']['elements']['panel-11']=trace_panel
    request_tab=next(t for t in session['spec']['layout']['spec']['tabs'] if t['spec']['title']=='Requests')
    request_tab['spec']['layout']['spec']['items'].extend(grid([(11,0,19,24,10)])['spec']['items'])


if __name__ == '__main__':
    for data in build():
        path=OUT/(data['metadata']['name']+'.json')
        path.write_text(json.dumps(data,indent=2)+'\n')
        print(path.name)
