import { assess, check, isApproval, requestKind } from './core.mjs';

// One native request per saved scenario. Interactive scripts can compose these
// explicitly for approval -> swap or other user-authorized multi-request flows.
export async function executeRequest(wallet, scenario, result, {
  authorized = false,
  trigger,
  capture = async () => {},
  verifyContext = async () => {},
}) {
  const kind = requestKind(scenario);
  const approve = isApproval(scenario);
  const expected = {...scenario.expected, account:scenario.expectedAccount, origin:new URL(scenario.url).host};
  let requestId;
  let actionAttempted = false;
  let triggered = false;
  try {
    if (approve) check(authorized === true, 'USER_AUTHORIZATION_REQUIRED');
    triggered = true; // A timed-out app click may still have opened a request.
    await trigger();
    const request = await wallet.request(kind);
    requestId = new URL(request.url()).hash;
    result.checks.confirmationOpened = 'PASS';
    result.walletEvidence = await wallet.inspect(kind, scenario.nativeFields);
    check(result.walletEvidence.requestId === requestId, 'REQUEST_CHANGED');
    result.assessment = assess(result.walletEvidence, expected, kind);
    result.checks.walletDetails = result.assessment.status;
    await capture(request);
    if (approve) {
      check(result.assessment.status !== 'FAIL', 'REQUEST_DETAILS_MISMATCH');
      check(result.assessment.status === 'PASS', 'REQUEST_DETAILS_INACCESSIBLE');
      await verifyContext();
      const options = {
        kind, expected, requestId, nativeFields:scenario.nativeFields, authorized,
        onAttempt:() => {
          actionAttempted = true;
          result.intentionalAuthorizationActions += 1;
          result.walletAction = {action:kind === 'signature' ? 'sign' : 'approve', attempted:true, completed:false};
        },
      };
      result.walletEvidence = kind === 'signature' ? await wallet.sign(options) : await wallet.approve(options);
      result.walletAction.completed = true;
      result.checks.requestApproved = 'PASS';
      result.checks.requestRejected = 'NOT_APPLICABLE';
    } else {
      await wallet.reject(kind, requestId, () => {
        actionAttempted = true;
        result.walletAction = {action:'reject', attempted:true, completed:false};
      });
      result.walletAction.completed = true;
      result.checks.requestRejected = 'PASS';
      result.checks.requestApproved = 'NOT_APPLICABLE';
    }
  } catch (error) {
    if (error.assessment) {
      result.walletEvidence = error.evidence;
      result.assessment = error.assessment;
      result.checks.walletDetails = error.assessment.status;
    }
    if (error.message === 'REQUEST_DETAILS_MISMATCH') result.checks.walletDetails = 'FAIL';
    // Never reject or retry after an uncertain approval/signature click. It might
    // already have succeeded and a subsequent request could belong to the next step.
    if (triggered && !actionAttempted && requestId && result.walletEvidence?.origin?.toLowerCase() === expected.origin.toLowerCase()) {
      try {
        await wallet.reject(kind, requestId, () => {
          actionAttempted = true;
          result.walletAction = {action:'reject', attempted:true, completed:false};
        });
        result.walletAction.completed = true;
        result.checks.requestRejected = 'PASS';
      } catch {
        result.cleanup = 'UNRESOLVED_REQUEST_DO_NOT_RETRY';
      }
    } else if (triggered) {
      result.cleanup = 'UNRESOLVED_REQUEST_DO_NOT_RETRY';
    }
    throw error;
  }
}
