// create-connected-app.apex
//
// Creates a Connected App for the Siemens EDA HAV Heroku front-end using
// the Metadata API via an Apex HTTP callout.
//
// Prerequisites:
//   1. A Remote Site Setting for your own org's Metadata API endpoint.
//      Go to Setup > Remote Site Settings > New:
//        - Name: SelfMetadataAPI
//        - URL:  (your org's My Domain URL, e.g., https://yourorg.my.salesforce.com)
//   2. The running user must have "Modify All Data" or "Modify Metadata" permission.
//
// To execute:
//   sf apex run --file scripts/apex/create-connected-app.apex [-o <org-alias>]

String endpoint = URL.getOrgDomainUrl().toExternalForm() + '/services/Soap/m/67.0';
String sessionId = UserInfo.getSessionId();

String soapBody = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"'
    + '                  xmlns:met="http://soap.sforce.com/2006/04/metadata">'
    + '  <soapenv:Header>'
    + '    <met:SessionHeader>'
    + '      <met:sessionId>' + sessionId + '</met:sessionId>'
    + '    </met:SessionHeader>'
    + '  </soapenv:Header>'
    + '  <soapenv:Body>'
    + '    <met:createMetadata>'
    + '      <met:metadata xsi:type="met:ConnectedApp"'
    + '                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + '        <met:fullName>Siemens_EDA_HAV_Heroku_Frontend</met:fullName>'
    + '        <met:label>Siemens EDA HAV Heroku Frontend</met:label>'
    + '        <met:contactEmail>admin@siemens-eda-hav.com</met:contactEmail>'
    + '        <met:description>External Client App for Siemens EDA HAV Heroku front-end (OAuth Client Credentials flow)</met:description>'
    + '        <met:oauthConfig>'
    + '          <met:callbackUrl>https://siemens-eda-hav.herokuapp.com/oauth/callback</met:callbackUrl>'
    + '          <met:isAdminApproved>true</met:isAdminApproved>'
    + '          <met:isClientCredentialFlowEnabled>true</met:isClientCredentialFlowEnabled>'
    + '          <met:scopes>Api</met:scopes>'
    + '          <met:scopes>RefreshToken</met:scopes>'
    + '        </met:oauthConfig>'
    + '        <met:oauthPolicy>'
    + '          <met:ipRelaxation>RELAXED</met:ipRelaxation>'
    + '          <met:refreshTokenPolicy>infinite</met:refreshTokenPolicy>'
    + '        </met:oauthPolicy>'
    + '      </met:metadata>'
    + '    </met:createMetadata>'
    + '  </soapenv:Body>'
    + '</soapenv:Envelope>';

HttpRequest req = new HttpRequest();
req.setEndpoint(endpoint);
req.setMethod('POST');
req.setHeader('Content-Type', 'text/xml');
req.setHeader('SOAPAction', 'createMetadata');
req.setBody(soapBody);

System.debug('Calling Metadata API at: ' + endpoint);

Http http = new Http();
HttpResponse res = http.send(req);

System.debug('HTTP Status: ' + res.getStatusCode());
System.debug('Response Body: ' + res.getBody());

if (res.getStatusCode() == 200) {
    String responseBody = res.getBody();
    if (responseBody.contains('<success>true</success>')) {
        System.debug('SUCCESS: Connected App "Siemens EDA HAV Heroku Frontend" created.');
        System.debug('');
        System.debug('Next steps:');
        System.debug('  1. Go to Setup > App Manager');
        System.debug('  2. Find "Siemens EDA HAV Heroku Frontend"');
        System.debug('  3. Click dropdown > Manage');
        System.debug('  4. Edit Policies:');
        System.debug('     - Permitted Users: Admin approved users are pre-authorized');
        System.debug('     - IP Relaxation: Relax IP restrictions');
        System.debug('  5. Under Client Credentials Flow, set "Run As" user');
        System.debug('  6. Copy Consumer Key and Secret to Heroku config vars');
    } else if (responseBody.contains('DUPLICATE_VALUE') || responseBody.contains('already exists')) {
        System.debug('Connected App already exists. No action taken.');
    } else {
        System.debug('WARNING: Unexpected response. The Connected App may not have been created.');
        System.debug('Check Setup > App Manager to verify.');
    }
} else {
    System.debug('ERROR: HTTP ' + res.getStatusCode());
    System.debug('Ensure you have:');
    System.debug('  1. A Remote Site Setting for: ' + URL.getOrgDomainUrl().toExternalForm());
    System.debug('  2. Modify All Data or Modify Metadata permission');
}
