import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../utils/oauth.js',import.meta.url),'utf8');
const {oauthFailureReason}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('OAuth failures distinguish database, missing verifier and expired flow without exposing callback secrets',()=>{
 const url='https://heda-app.netlify.app/?code=PRIVATE_CODE#access_token=PRIVATE_TOKEN';
 assert.match(oauthFailureReason({code:'unexpected_failure',message:'Database error saving new user'},url),/^GOOGLE_DATABASE:/);
 assert.match(oauthFailureReason({code:'flow_state_expired'},url),/^GOOGLE_PKCE:/);
 assert.match(oauthFailureReason({code:'pkce_code_verifier_not_found'},url),/^GOOGLE_VERIFIER:/);
 assert.match(oauthFailureReason(null,url),/^GOOGLE_NO_SESSION:/);
 const result=oauthFailureReason({code:'unknown',message:'PRIVATE_MESSAGE'},url);
 for(const secret of ['PRIVATE_CODE','PRIVATE_TOKEN','PRIVATE_MESSAGE'])assert.ok(!result.includes(secret));
});
test('OAuth provider errors in URL fragments are classified without echoing arbitrary descriptions',()=>{
 assert.match(oauthFailureReason(null,'https://heda-app.netlify.app/#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user'),/^GOOGLE_DATABASE:/);
 assert.match(oauthFailureReason(null,'https://heda-app.netlify.app/#error=server_error&error_description=PRIVATE'),/^GOOGLE_AUTH:/);
});
