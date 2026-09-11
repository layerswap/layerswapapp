import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const dashboard = read('../faro-dev-vertical-slice.json');
const overview = read('../faro-dev-error-overview.json');
const fixture = read('../fixtures/faro-loki-observed-records.json');
const panels = new Map(dashboard.panels.map(panel => [panel.id, panel]));
const variables = Object.fromEntries(dashboard.templating.list.map(v => [v.name, v.current.value]));
const error = {...fixture.records.find(r => r.parsedFields.kind === 'exception').parsedFields, stored_ns:'1788853949049000000'};

// Scalar behavior checked against Grafana Scenes formatRegistry.ts:
// https://github.com/grafana/scenes/blob/main/packages/scenes/src/variables/interpolation/formatRegistry.ts
// This is still NOT execution of Grafana's browser runtime.
function interpolate(template, vars, row = {}) {
  return template.replace(/\$\{(__data\.fields\["([^"]+)"\]|[^}:]+)(?::([^}]+))?\}/g,
    (_, key, field, format) => {
      const value = field ? row[field] : vars[key];
      assert.notEqual(value, undefined, `Missing template value: ${key}`);
      if (format === 'json') return typeof value === 'string' ? value : JSON.stringify(value);
      if (format === 'doublequote') return `"${String(value).replaceAll('"', '\\"')}"`;
      if (format === 'percentencode') return encodeURIComponent(value);
      assert.equal(format, undefined);
      return String(value);
    });
}

const dataLink = panel => panels.get(panel).fieldConfig.overrides[0].properties.find(p => p.id === 'links').value[0].url;

test('scope stays dev-only and does not modify ingest labels or add thresholds', () => {
  assert.equal(dashboard.uid, 'layerswap-faro-dev-slice');
  assert.equal(dashboard.panels.length, 9);
  assert.equal(dashboard.refresh, '');
  for (const panel of dashboard.panels.filter(p => p.targets)) {
    assert.equal(panel.datasource.uid, 'P8E80F9AEF21F6940');
    assert.equal(panel.datasource.type, 'loki');
    assert.equal(panel.fieldConfig.defaults.thresholds, undefined);
    const query = panel.targets[0].expr;
    assert.match(query, /\{source="faro"\}/);
    assert.match(query, /\| logfmt \| __error__=""/);
    assert.match(query, /app_name=\$\{application:doublequote\}/);
    assert.match(query, /app_environment=\$\{environment:doublequote\}/);
    assert.match(query, /app_version=\$\{release:doublequote\}/);
    assert.doesNotMatch(query, /:json\}/);
    assert.doesNotMatch(query, /\b(rate|quantile_over_time)\(/);
  }
});

test('overview type → hidden variant → session → raw event preserves context and absolute time', () => {
  const vars = {...variables, __from: 1788853800000, __to: 1788856200000};
  const navigate = (template, row) => {
    const url = new URL(interpolate(template, vars, row), 'https://grafana-2.dev.lb.layerswap.cloud');
    assert.match(url.pathname, /\/d\/layerswap-faro-dev-slice(?:\/|$)/);
    assert.equal(url.searchParams.get('from'), String(vars.__from));
    assert.equal(url.searchParams.get('to'), String(vars.__to));
    for (const key of ['application', 'environment', 'release', 'error_marker']) {
      assert.equal(url.searchParams.get(`var-${key}`), vars[key]);
    }
    for (const key of Object.keys(variables)) {
      assert.equal(url.searchParams.getAll(`var-${key}`).length, 1);
      vars[key] = url.searchParams.get(`var-${key}`);
    }
  };
  navigate(overview.panels.find(p=>p.id===3).fieldConfig.overrides[0].properties.find(p=>p.id==='links').value[0].url, error);
  assert.equal(vars.error_type, error.type);
  assert.equal(vars.error_hash, '.*');
  navigate(dataLink(3), error);
  assert.equal(vars.error_hash, error.hash);
  assert.equal(vars.error_type, error.type);
  assert.equal(vars.session_id, '__select_session__');
  navigate(dataLink(4), error);
  assert.equal(vars.session_id, error.session_id);
  assert.equal(vars.event_time, '__select_event__');
  navigate(dataLink(5), error);
  assert.equal(vars.event_time, error.timestamp);
  assert.equal(vars.event_kind, 'exception');
  assert.equal(vars.event_ns, error.stored_ns);
  const rawQuery = interpolate(panels.get(6).targets[0].expr, vars);
  assert(rawQuery.includes(`session_id=${JSON.stringify(error.session_id)}`));
  assert(rawQuery.includes(`timestamp=${JSON.stringify(error.timestamp)}`));
  assert(rawQuery.includes('kind="exception"'));
});

test('URL encoding round-trips special characters without extra parameters', () => {
  const special = 'a &?/# + " \\ \n Unicode: λ';
  const vars = Object.fromEntries(Object.keys(variables).map(key => [key, special]));
  Object.assign(vars, {__from: 1788853800000, __to: 1788856200000});
  const row = {type:special, hash:special, session_id:special, timestamp:special, kind:special, stored_ns:special};
  for (const id of [3, 4, 5, 7, 8, 9]) {
    const url = new URL(interpolate(dataLink(id), vars, row), 'https://grafana-2.dev.lb.layerswap.cloud');
    assert.equal(url.searchParams.get('var-application'), special);
    assert.equal(url.searchParams.get('var-environment'), special);
    assert.equal(url.searchParams.get('var-release'), special);
    assert.equal(url.searchParams.size, Object.keys(variables).length + 3);
    assert.equal(url.hash, '');
  }
});

test('textbox JSON format is not string quoting; doublequote prevents the column-89 regression', () => {
  assert.equal(interpolate('${application:json}', variables), 'layerswap-frontend');
  assert.equal(interpolate('${application:doublequote}', variables), '"layerswap-frontend"');
  const corrected = interpolate(panels.get(3).targets[0].expr, variables);
  assert(corrected.includes('app_name="layerswap-frontend"'));
  const old = interpolate(panels.get(3).targets[0].expr.replaceAll(':doublequote}', ':json}'), variables);
  assert(old.includes('app_name=layerswap-frontend'));
  const quoteValue = 'quote " and &? Unicode: λ';
  assert.equal(JSON.parse(interpolate('${session_id:doublequote}', {session_id:quoteValue})), quoteValue);
  // doublequote escapes quotation marks, not arbitrary backslashes/control characters.
  assert.equal(interpolate('${session_id:doublequote}', {session_id:'a\\b'}), '"a\\b"');
});

test('selection sentinels cannot broaden an empty session query', () => {
  for (const id of [5, 6]) {
    const query = interpolate(panels.get(id).targets[0].expr, variables);
    assert(query.includes('session_id="__select_session__"'));
    assert(query.includes('session_id!="__select_session__"'));
    assert(query.includes('session_id!=""'));
  }
  assert.equal(variables.error_hash, '.*');
  assert.equal(variables.event_time, '__select_event__');
  assert.equal(panels.get(2).targets[0].expr.endsWith('or vector(0)'), true);
});

test('timeline uses observed fields, numeric sequence, client time and a bounded query', () => {
  const panel = panels.get(5);
  const observed = new Set(fixture.records.flatMap(r => Object.keys(r.parsedFields)));
  // Query-derived display fields, not newly emitted/stored attributes.
  observed.add('stored_ns'); observed.add('message_summary');
  const projected = [...panel.targets[0].expr.matchAll(/printf "%q" \.(\w+)/g)].map(m => m[1]);
  assert(projected.length > 0);
  for (const field of projected) assert(observed.has(field), `Unobserved field: ${field}`);
  assert.equal(panel.targets[0].maxLines, 1000);
  assert.equal(panel.targets[0].direction, 'forward');
  assert.deepEqual(panel.transformations[0], {id:'extractFields',options:{source:'Line',format:'json',replace:true,keepTime:false}});
  assert.deepEqual(panel.transformations[1].options.conversions, ['event_data_sequence','event_data_attempt'].map(targetField=>({targetField,destinationType:'number'})));
  assert.equal(panel.transformations[2].options.sort[0].field, 'timestamp');
  const sequence = ['10', '9'].sort((a, b) => Number(a) - Number(b));
  assert.deepEqual(sequence, ['9', '10']);
});

test('fixtures distinguish contextual HTTP traces from uncorrelated errors', () => {
  const rows = fixture.records.filter(r => r.scenario === 'controlled_replay').map(r => r.parsedFields);
  assert.equal(rows.length, 9);
  const errors = rows.filter(r => r.kind === 'exception');
  assert.equal(errors.length, 2);
  assert(errors.every(r => !r.traceID));
  const http = rows.filter(r => r.event_name === 'faro.tracing.fetch');
  assert.equal(http.length, 3);
  assert(http.every(r => r.traceID && r.spanID && r.session_id === error.session_id));
  assert.equal(fixture.streamLabelsObserved.includes('session_id'), false);
  assert.equal(fixture.streamLabelsObserved.includes('traceID'), false);
});

test('wallet search inspects every JSON element, rejects blank search and leaves session timeline unfiltered', () => {
  const query = panels.get(7).targets[0].expr;
  assert.equal(variables.wallet_address, '');
  assert(query.includes('wallet_needle=${wallet_address:doublequote}'));
  assert(query.includes('wallet_needle!=""'));
  assert(query.includes('range $wallet := fromJson .session_attr_connected_wallets'));
  assert(query.includes('eq $wallet.wallet_address $needle'));
  assert(query.includes('wallet_match="true" | keep session_id'));
  assert(query.startsWith('sum by (session_id) (count_over_time('));
  assert(!query.includes('[0]'));
  assert(!query.includes('${error_marker'));
  for (const id of [5, 6]) {
    assert(!panels.get(id).targets[0].expr.includes('wallet_address'));
    assert(!panels.get(id).targets[0].expr.includes('connected_wallets'));
  }
});

test('wallet-session link preserves search/scope/time but clears stale error and event selections', () => {
  const vars = {...variables, wallet_address:'test-wallet-address', environment:'testnet',
    error_type:'old-type', error_hash:'old-hash', event_time:'old-time', event_kind:'old-kind',
    __from:1788875100000, __to:1788876900000};
  const url = new URL(interpolate(dataLink(7), vars, {session_id:'test-wallet-session'}), 'https://grafana-2.dev.lb.layerswap.cloud');
  for (const key of ['application','environment','release','wallet_address','error_marker']) assert.equal(url.searchParams.get(`var-${key}`),vars[key]);
  assert.equal(url.searchParams.get('from'),String(vars.__from));
  assert.equal(url.searchParams.get('to'),String(vars.__to));
  assert.equal(url.searchParams.get('var-session_id'),'test-wallet-session');
  assert.equal(url.searchParams.get('var-error_type'),'__select_group__');
  assert.equal(url.searchParams.get('var-error_hash'),'.*');
  assert.equal(url.searchParams.get('var-event_time'),'__select_event__');
  assert.equal(url.searchParams.get('var-event_kind'),'__select_event__');
  assert.equal(url.searchParams.get('var-event_ns'),'__select_event__');
  for (const key of Object.keys(variables)) assert.equal(url.searchParams.getAll(`var-${key}`).length,1);
});

test('clarity update separates general investigation from dedicated operation dashboards', () => {
  assert.equal(dashboard.templating.list.find(v=>v.name==='error_marker').label,'Error record contains');
  for (const p of dashboard.panels) assert.doesNotMatch(p.title,/RPC|balance|gas fee|transaction errors/i);
  for (const id of [3,4]) {
    const renames=panels.get(id).transformations.find(t=>t.id==='organize').options.renameByName;
    assert.equal(renames.Value,'Error records'); assert.equal(renames['Value #A'],'Error records');
  }
  for (const id of [2,3]) assert(!panels.get(id).targets[0].expr.includes('${session_id'));
  const q=panels.get(9).targets[0].expr;
  assert(q.includes('event_name="swap_lifecycle"'));
  for (const v of ['error_marker','session_id','wallet_address','error_hash']) assert(!q.includes('${'+v));
  assert.equal(panels.get(9).targets[0].maxLines,1000);
  assert.equal(panels.get(9).targets[0].direction,'backward');
  assert.equal(panels.get(8).targets[0].maxLines,20);
  assert(panels.get(8).targets[0].expr.includes('type!="__select_group__"'));
  assert(panels.get(8).targets[0].expr.includes('hash=~${error_hash:doublequote}'));
});

test('timeline text uses event-local details and preserves exact stored-time strings for selection', () => {
  for (const id of [5,8,9]) {
    const panel=panels.get(id),query=panel.targets[0].expr;
    assert(query.includes('__timestamp__ | unixEpochNanos'));
    assert(query.includes('if .value') && query.includes('else if .message') && query.includes('else if .event_data_reason'));
    assert(!query.includes('.session_attr_reason'));
    assert(!panel.transformations[1].options.conversions.some(c=>c.targetField==='stored_ns'));
    assert(!panel.transformations.at(-1).options.excludeByName?.stored_ns);
    const url=new URL(interpolate(dataLink(id),{...variables,__from:1,__to:2},error),'https://grafana-2.dev.lb.layerswap.cloud');
    assert.equal(url.searchParams.get('var-event_ns'),error.stored_ns);
    if(id!==5) assert.equal(url.searchParams.get('var-session_id'),error.session_id);
  }
  const query=interpolate(panels.get(6).targets[0].expr,{...variables,session_id:error.session_id,event_time:error.timestamp,event_kind:error.kind,event_ns:error.stored_ns});
  assert(query.includes('stored_ns="'+error.stored_ns+'"'));
  assert(query.includes('stored_ns!="__select_event__"'));
});

test('overview pivots statistics into one row per type without exposing message hashes', () => {
  assert.equal(overview.uid,'layerswap-faro-dev-errors');
  assert.equal(overview.panels.length,3);
  assert.equal(overview.templating.list.find(v=>v.name==='error_marker').current.value,'');
  const panel=overview.panels.find(p=>p.id===3),q=panel.targets[0].expr;
  assert(q.includes('sum by (type) (count_over_time('));
  assert(q.includes('count by (type) (sum by (type, session_id)'));
  assert(q.includes('session_id!=""'));
  assert(q.includes('unixEpochMillis'));
  assert(!q.includes('hash'));
  assert.deepEqual(panel.transformations[0],{id:'labelsToFields',options:{mode:'columns',valueLabel:'statistic'}});
  assert.deepEqual(panel.transformations[1],{id:'merge',options:{}});
  for(const field of ['Error records','Recorded sessions','Latest stored occurrence'])assert(q.includes('"'+field+'"'));
  const rows=new Map();
  // Explicitly modeled transformation input, NOT captured Faro telemetry.
  for(const [type,statistic,value]of [['A','Error records',4],['A','Recorded sessions',2],['A','Latest stored occurrence',1000],['B','Error records',1],['B','Latest stored occurrence',900]]){
    const row=rows.get(type)||{type};row[statistic]=value;rows.set(type,row);
  }
  assert.equal(rows.size,2);assert.equal(rows.get('A')['Recorded sessions'],2);
  assert.equal(rows.get('B')['Recorded sessions'],undefined);
  assert(panel.fieldConfig.overrides.some(o=>o.matcher.options==='Recorded sessions'&&o.properties.some(p=>p.id==='noValue'&&p.value==='0')));
});

test('fingerprint is an internal selector only and selecting a type starts with all variants', () => {
  assert.equal(dashboard.templating.list.find(v=>v.name==='error_hash').hide,2);
  const group=panels.get(3);
  assert(group.fieldConfig.overrides.some(o=>o.matcher.options==='hash'&&o.properties.some(p=>p.id==='custom.hidden'&&p.value)));
  assert.equal(group.fieldConfig.overrides[0].matcher.options,'value');
  for(const id of [2,3,4,8])assert(panels.get(id).targets[0].expr.includes('type!="__select_group__"'));
  for(const id of [2,3])assert(!panels.get(id).targets[0].expr.includes('${error_hash'));
  for(const id of [4,8])assert(panels.get(id).targets[0].expr.includes('hash=~${error_hash:doublequote}'));
  assert(!group.transformations.at(-1).options.excludeByName.hash,'hidden link field must remain in frame');
  for(const id of [3,4,7])assert(panels.get(id).transformations.some(t=>t.id==='merge'));
});

test('overview/back/all-variants links preserve time and scope and reset stale selections', () => {
  const vars={...variables,application:'app & λ',environment:'testnet',release:'local',error_type:'ContractFunctionExecutionError',error_hash:'123',session_id:'old',event_ns:'1234567890123456789',__from:1,__to:2};
  for(const link of dashboard.links){
    const u=new URL(interpolate(link.url,vars),'https://grafana-2.dev.lb.layerswap.cloud');
    for(const key of ['application','environment','release','wallet_address','error_marker'])assert.equal(u.searchParams.get('var-'+key),vars[key]);
    assert.equal(u.searchParams.get('from'),'1');assert.equal(u.searchParams.get('to'),'2');
    assert.equal(u.searchParams.get('var-error_hash'),'.*');
    assert.equal(u.searchParams.get('var-session_id'),'__select_session__');
    assert.equal(u.searchParams.get('var-event_ns'),'__select_event__');
    if(link.title==='All variants of selected type')assert.equal(u.searchParams.get('var-error_type'),vars.error_type);
  }
});
