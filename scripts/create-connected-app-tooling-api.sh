#!/usr/bin/env bash
###############################################################################
# create-connected-app-tooling-api.sh
#
# Creates a Connected App programmatically using the Salesforce Metadata API
# via the Tooling API's MetadataContainer/deploy mechanism.
#
# This is the most reliable programmatic approach because the Tooling API's
# ConnectedApplication sObject is read-only (no direct INSERT). Instead, we
# use the Metadata API SOAP deploy wrapped in a curl-based REST call.
#
# Prerequisites:
#   - sf CLI installed and authenticated
#   - jq installed
#   - base64, zip commands available
#
# Usage:
#   bash scripts/create-connected-app-tooling-api.sh [org-alias]
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_LABEL="Siemens EDA HAV Heroku Frontend"
APP_NAME="Siemens_EDA_HAV_Heroku_Frontend"
APP_DESCRIPTION="External Client App for Siemens EDA HAV Heroku front-end (OAuth Client Credentials)"
APP_CONTACT_EMAIL="admin@siemens-eda-hav.com"
CALLBACK_URL="https://siemens-eda-hav.herokuapp.com/oauth/callback"
API_VERSION="67.0"

ORG_ALIAS="${1:-}"
ORG_FLAG=""
if [[ -n "$ORG_ALIAS" ]]; then
    ORG_FLAG="--target-org $ORG_ALIAS"
fi

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
for cmd in sf jq zip base64 curl; do
    if ! command -v "$cmd" &>/dev/null; then
        error "'$cmd' is required but not found."
        exit 1
    fi
done

ORG_INFO=$(sf org display $ORG_FLAG --json)
INSTANCE_URL=$(echo "$ORG_INFO" | jq -r '.result.instanceUrl')
ACCESS_TOKEN=$(echo "$ORG_INFO" | jq -r '.result.accessToken')
USERNAME=$(echo "$ORG_INFO" | jq -r '.result.username')

success "Authenticated as $USERNAME at $INSTANCE_URL"

# ---------------------------------------------------------------------------
# Method 1: Metadata API Deploy via sf CLI (recommended)
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Method 1: Metadata API Deploy via sf CLI"
info "=========================================="

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# Create the Connected App metadata
CONNECTED_APP_DIR="$WORK_DIR/force-app/main/default/connectedApps"
mkdir -p "$CONNECTED_APP_DIR"

cat > "$CONNECTED_APP_DIR/${APP_NAME}.connectedApp-meta.xml" <<'XMLEOF'
<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
    <contactEmail>admin@siemens-eda-hav.com</contactEmail>
    <description>External Client App for Siemens EDA HAV Heroku front-end (OAuth Client Credentials)</description>
    <label>Siemens EDA HAV Heroku Frontend</label>
    <oauthConfig>
        <callbackUrl>https://siemens-eda-hav.herokuapp.com/oauth/callback</callbackUrl>
        <isAdminApproved>true</isAdminApproved>
        <isClientCredentialFlowEnabled>true</isClientCredentialFlowEnabled>
        <scopes>Api</scopes>
        <scopes>RefreshToken</scopes>
    </oauthConfig>
    <oauthPolicy>
        <ipRelaxation>RELAXED</ipRelaxation>
        <refreshTokenPolicy>infinite</refreshTokenPolicy>
    </oauthPolicy>
</ConnectedApp>
XMLEOF

cat > "$WORK_DIR/sfdx-project.json" <<JSONEOF
{
    "packageDirectories": [{ "path": "force-app", "default": true }],
    "sourceApiVersion": "$API_VERSION"
}
JSONEOF

info "Deploying Connected App via sf project deploy..."
DEPLOY_RESULT=$(sf project deploy start \
    --source-dir "$CONNECTED_APP_DIR" \
    $ORG_FLAG \
    --wait 10 \
    --json 2>&1) || true

DEPLOY_STATUS=$(echo "$DEPLOY_RESULT" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")

if [[ "$DEPLOY_STATUS" == "0" ]]; then
    success "Connected App deployed successfully via Metadata API!"
    echo ""
    info "Retrieving consumer key..."

    # Query for the consumer key via Tooling API
    sleep 5  # Brief wait for propagation
    QUERY_RESULT=$(curl -s \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        "$INSTANCE_URL/services/data/v${API_VERSION}/tooling/query?q=SELECT+Id,Name+FROM+ConnectedApplication+WHERE+Name='$APP_NAME'" \
    )

    APP_COUNT=$(echo "$QUERY_RESULT" | jq -r '.totalSize // 0')
    if [[ "$APP_COUNT" -gt 0 ]]; then
        success "Connected App confirmed in org."
        info "Retrieve Consumer Key and Secret from Setup > App Manager > $APP_LABEL"
    fi
else
    warn "Metadata deploy did not succeed. Trying Method 2..."
    echo "$DEPLOY_RESULT" | jq -r '.message // .result.details.componentFailures[]?.problem // "See output above"' 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Method 2: Metadata API Deploy via raw SOAP/REST (fallback)
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Method 2: Raw Metadata API Deploy (fallback)"
info "=========================================="

# Build a Metadata API deployment zip
DEPLOY_DIR=$(mktemp -d)
mkdir -p "$DEPLOY_DIR/connectedApps"

# package.xml
cat > "$DEPLOY_DIR/package.xml" <<PKGEOF
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${APP_NAME}</members>
        <name>ConnectedApp</name>
    </types>
    <version>${API_VERSION}</version>
</Package>
PKGEOF

# Connected App metadata (mdapi format)
cat > "$DEPLOY_DIR/connectedApps/${APP_NAME}.connectedApp" <<'CAEOF'
<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
    <contactEmail>admin@siemens-eda-hav.com</contactEmail>
    <description>External Client App for Siemens EDA HAV Heroku front-end (OAuth Client Credentials)</description>
    <label>Siemens EDA HAV Heroku Frontend</label>
    <oauthConfig>
        <callbackUrl>https://siemens-eda-hav.herokuapp.com/oauth/callback</callbackUrl>
        <isAdminApproved>true</isAdminApproved>
        <isClientCredentialFlowEnabled>true</isClientCredentialFlowEnabled>
        <scopes>Api</scopes>
        <scopes>RefreshToken</scopes>
    </oauthConfig>
    <oauthPolicy>
        <ipRelaxation>RELAXED</ipRelaxation>
        <refreshTokenPolicy>infinite</refreshTokenPolicy>
    </oauthPolicy>
</ConnectedApp>
CAEOF

# Create zip
ZIP_FILE="$WORK_DIR/deploy.zip"
(cd "$DEPLOY_DIR" && zip -r "$ZIP_FILE" . -q)
ZIP_BASE64=$(base64 -w0 "$ZIP_FILE" 2>/dev/null || base64 "$ZIP_FILE")

rm -rf "$DEPLOY_DIR"

info "Deploying via Metadata API REST endpoint..."

DEPLOY_RESPONSE=$(curl -s -X POST \
    "$INSTANCE_URL/services/Soap/m/${API_VERSION}" \
    -H "Content-Type: text/xml" \
    -H "SOAPAction: deploy" \
    -d "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"
                  xmlns:met=\"http://soap.sforce.com/2006/04/metadata\">
    <soapenv:Header>
        <met:SessionHeader>
            <met:sessionId>${ACCESS_TOKEN}</met:sessionId>
        </met:SessionHeader>
    </soapenv:Header>
    <soapenv:Body>
        <met:deploy>
            <met:ZipFile>${ZIP_BASE64}</met:ZipFile>
            <met:DeployOptions>
                <met:singlePackage>true</met:singlePackage>
                <met:rollbackOnError>true</met:rollbackOnError>
            </met:DeployOptions>
        </met:deploy>
    </soapenv:Body>
</soapenv:Envelope>")

# Extract deploy ID
DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | grep -oP '(?<=<id>)[^<]+' | head -1 || true)

if [[ -n "$DEPLOY_ID" ]]; then
    info "Metadata deploy initiated. Deploy ID: $DEPLOY_ID"
    info "Checking deploy status..."

    for i in $(seq 1 12); do
        sleep 5
        STATUS_RESPONSE=$(curl -s -X POST \
            "$INSTANCE_URL/services/Soap/m/${API_VERSION}" \
            -H "Content-Type: text/xml" \
            -H "SOAPAction: checkDeployStatus" \
            -d "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"
                  xmlns:met=\"http://soap.sforce.com/2006/04/metadata\">
    <soapenv:Header>
        <met:SessionHeader>
            <met:sessionId>${ACCESS_TOKEN}</met:sessionId>
        </met:SessionHeader>
    </soapenv:Header>
    <soapenv:Body>
        <met:checkDeployStatus>
            <met:asyncProcessId>${DEPLOY_ID}</met:asyncProcessId>
            <met:includeDetails>true</met:includeDetails>
        </met:checkDeployStatus>
    </soapenv:Body>
</soapenv:Envelope>")

        DONE=$(echo "$STATUS_RESPONSE" | grep -oP '(?<=<done>)[^<]+' | head -1 || echo "false")
        STATUS=$(echo "$STATUS_RESPONSE" | grep -oP '(?<=<status>)[^<]+' | head -1 || echo "Unknown")

        info "  Attempt $i: status=$STATUS done=$DONE"

        if [[ "$DONE" == "true" ]]; then
            if echo "$STATUS_RESPONSE" | grep -q '<success>true</success>'; then
                success "Metadata API deploy succeeded!"
            else
                FAILURE=$(echo "$STATUS_RESPONSE" | grep -oP '(?<=<problem>)[^<]+' || echo "Unknown error")
                warn "Deploy completed with errors: $FAILURE"
            fi
            break
        fi
    done
else
    warn "Could not initiate Metadata API deploy. Response:"
    echo "$DEPLOY_RESPONSE" | head -20
fi

# ---------------------------------------------------------------------------
# Method 3: Anonymous Apex (limited -- creates basic Connected App record)
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Method 3: Anonymous Apex (informational)"
info "=========================================="

info "Note: Anonymous Apex cannot directly create Connected App OAuth configs."
info "The ConnectedApplication object is not directly insertable via Apex DML."
info "However, you can use Apex to call the Metadata API via callouts."
echo ""
info "An example Apex class that wraps the Metadata API is provided in:"
info "  scripts/apex/create-connected-app.apex"

# Create the Apex script for reference
APEX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/apex"
mkdir -p "$APEX_DIR"

cat > "$APEX_DIR/create-connected-app.apex" <<'APEXEOF'
// create-connected-app.apex
//
// NOTE: This script demonstrates using the Metadata API via Apex to create
// a Connected App. However, this requires:
//   1. A Remote Site Setting for your own org's Metadata API endpoint
//   2. The session to have Metadata API permissions
//
// This is provided for reference. In practice, use the shell script or
// manual Setup steps instead.
//
// To execute:
//   sf apex run --file scripts/apex/create-connected-app.apex

String endpoint = URL.getOrgDomainUrl().toExternalForm() + '/services/Soap/m/67.0';
String sessionId = UserInfo.getSessionId();

String body = '<?xml version="1.0" encoding="UTF-8"?>'
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
    + '        <met:description>External Client App for Siemens EDA HAV Heroku front-end</met:description>'
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
req.setBody(body);

Http http = new Http();
HttpResponse res = http.send(req);

System.debug('Status: ' + res.getStatusCode());
System.debug('Body: ' + res.getBody());

if (res.getStatusCode() == 200) {
    if (res.getBody().contains('<success>true</success>')) {
        System.debug('Connected App created successfully!');
        System.debug('Retrieve consumer key from Setup > App Manager');
    } else {
        System.debug('Connected App creation may have failed. Check response.');
    }
} else {
    System.debug('HTTP Error: ' + res.getStatusCode());
}
APEXEOF

success "Anonymous Apex script written to scripts/apex/create-connected-app.apex"

# ---------------------------------------------------------------------------
# Final Summary
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "FINAL SUMMARY"
info "=========================================="
echo ""
info "Files created/used:"
info "  - force-app/main/default/corsWhitelistOrigins/ (3 CORS entries)"
info "  - scripts/setup-connected-app.sh (this script)"
info "  - scripts/apex/create-connected-app.apex (Apex reference)"
echo ""
info "What was attempted:"
info "  1. CORS whitelist deployment"
info "  2. Connected App creation via sf CLI metadata deploy"
info "  3. Connected App creation via raw Metadata API SOAP deploy"
echo ""
warn "MANUAL STEPS STILL REQUIRED:"
echo ""
echo "  1. Verify the Connected App in Setup > App Manager"
echo "  2. Configure OAuth Policies:"
echo "     - Permitted Users: Admin approved users are pre-authorized"
echo "     - IP Relaxation: Relax IP restrictions"
echo "  3. Configure Client Credentials Flow:"
echo "     - Set 'Run As' user to the integration user"
echo "  4. Add Permission Set assignment for the run-as user"
echo "  5. Copy Consumer Key and Secret to Heroku config vars"
echo ""
echo "  heroku config:set SF_LOGIN_URL='$INSTANCE_URL' -a siemens-eda-hav"
echo "  heroku config:set SF_CLIENT_ID='<CONSUMER_KEY>' -a siemens-eda-hav"
echo "  heroku config:set SF_CLIENT_SECRET='<CONSUMER_SECRET>' -a siemens-eda-hav"
echo ""
