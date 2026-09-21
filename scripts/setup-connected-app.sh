#!/usr/bin/env bash
###############################################################################
# setup-connected-app.sh
#
# Creates an External Client App (Connected App) for the Siemens EDA HAV
# Heroku front-end using the OAuth Client Credentials flow.
#
# Connected Apps with consumer key/secret pairs CANNOT be fully provisioned
# via metadata deployment. This script automates the setup using the Salesforce
# Tooling API (via sf CLI) and documents the manual fallback steps.
#
# Prerequisites:
#   - Salesforce CLI (sf) installed and authenticated to the target org
#   - jq installed (for JSON parsing)
#   - Target org set as default, or pass -o <alias> to sf commands
#
# Usage:
#   ./scripts/setup-connected-app.sh [org-alias]
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_LABEL="Siemens EDA HAV Heroku Frontend"
APP_NAME="Siemens_EDA_HAV_Heroku_Frontend"
APP_DESCRIPTION="External Client App for Siemens EDA HAV Heroku front-end using OAuth Client Credentials flow"
APP_CONTACT_EMAIL="admin@siemens-eda-hav.com"
CALLBACK_URL="https://siemens-eda-hav.herokuapp.com/oauth/callback"

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
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
info "Checking prerequisites..."

if ! command -v sf &>/dev/null; then
    error "'sf' CLI not found. Install it: https://developer.salesforce.com/tools/salesforcecli"
    exit 1
fi

if ! command -v jq &>/dev/null; then
    error "'jq' not found. Install it: https://jqlang.github.io/jq/download/"
    exit 1
fi

# Verify org authentication
info "Verifying org authentication..."
if ! sf org display $ORG_FLAG --json &>/dev/null; then
    error "Cannot connect to org. Run 'sf org login web' first."
    exit 1
fi

ORG_INFO=$(sf org display $ORG_FLAG --json)
INSTANCE_URL=$(echo "$ORG_INFO" | jq -r '.result.instanceUrl')
ACCESS_TOKEN=$(echo "$ORG_INFO" | jq -r '.result.accessToken')
USERNAME=$(echo "$ORG_INFO" | jq -r '.result.username')

success "Authenticated as $USERNAME"
info "Instance URL: $INSTANCE_URL"

# ---------------------------------------------------------------------------
# Step 1: Deploy CORS Whitelist Origins
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 1: Deploying CORS Whitelist Origins"
info "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

info "Deploying CORS metadata from force-app..."
if sf project deploy start \
    --source-dir "$PROJECT_ROOT/force-app/main/default/corsWhitelistOrigins" \
    $ORG_FLAG \
    --wait 5 2>/dev/null; then
    success "CORS whitelist origins deployed successfully"
else
    warn "CORS deployment failed or partially succeeded. You may need to add these manually:"
    warn "  - https://siemens-eda-hav.herokuapp.com"
    warn "  - http://localhost:5173"
    warn "  - http://localhost:3000"
    warn "  Setup > CORS > New"
fi

# ---------------------------------------------------------------------------
# Step 2: Create Connected App via Tooling API
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 2: Creating Connected App via Tooling API"
info "=========================================="

# Check if Connected App already exists
info "Checking if Connected App '$APP_NAME' already exists..."
EXISTING=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$INSTANCE_URL/services/data/v67.0/tooling/query?q=SELECT+Id,Name+FROM+ConnectedApplication+WHERE+Name='$APP_NAME'" \
)

EXISTING_COUNT=$(echo "$EXISTING" | jq -r '.totalSize // 0')

if [[ "$EXISTING_COUNT" -gt 0 ]]; then
    warn "Connected App '$APP_NAME' already exists. Skipping creation."
    CONNECTED_APP_ID=$(echo "$EXISTING" | jq -r '.records[0].Id')
    info "Existing Connected App Id: $CONNECTED_APP_ID"
else
    info "Creating Connected App via Tooling API..."

    # The Tooling API ConnectedApplication object does not support direct
    # creation with full OAuth config. We use the metadata approach via
    # the Tooling API's MetadataContainer + deploy pattern instead.
    #
    # However, the most reliable approach is to create via the REST-based
    # Connected App creation endpoint or use SFDX commands.

    # Attempt: Use sf CLI to create via metadata deploy with a temporary
    # ConnectedApp metadata file. Note: This creates the app but Salesforce
    # auto-generates the consumer key and secret.

    TEMP_DIR=$(mktemp -d)
    CONNECTED_APP_DIR="$TEMP_DIR/force-app/main/default/connectedApps"
    mkdir -p "$CONNECTED_APP_DIR"

    cat > "$CONNECTED_APP_DIR/${APP_NAME}.connectedApp-meta.xml" <<XMLEOF
<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
    <contactEmail>${APP_CONTACT_EMAIL}</contactEmail>
    <description>${APP_DESCRIPTION}</description>
    <label>${APP_LABEL}</label>
    <oauthConfig>
        <callbackUrl>${CALLBACK_URL}</callbackUrl>
        <consumerKey>AUTO_GENERATED</consumerKey>
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

    # Create a minimal sfdx-project.json in the temp dir
    cat > "$TEMP_DIR/sfdx-project.json" <<JSONEOF
{
    "packageDirectories": [{ "path": "force-app", "default": true }],
    "sourceApiVersion": "67.0"
}
JSONEOF

    info "Deploying Connected App metadata..."
    if sf project deploy start \
        --source-dir "$CONNECTED_APP_DIR" \
        --manifest-type metadata \
        $ORG_FLAG \
        --wait 10 2>&1; then
        success "Connected App deployed via metadata"
    else
        warn "Metadata deploy of Connected App failed."
        warn "This is expected -- Connected Apps often require manual setup."
        warn "See manual steps below."
    fi

    # Clean up temp directory
    rm -rf "$TEMP_DIR"
fi

# ---------------------------------------------------------------------------
# Step 3: Retrieve Consumer Key and Secret
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 3: Retrieving Consumer Credentials"
info "=========================================="

info "Querying for Connected App consumer key..."
CONSUMER_INFO=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "$INSTANCE_URL/services/data/v67.0/tooling/query?q=SELECT+Id,Name,Options+FROM+ConnectedApplication+WHERE+Name='$APP_NAME'" \
)

if [[ $(echo "$CONSUMER_INFO" | jq -r '.totalSize // 0') -gt 0 ]]; then
    success "Connected App found. Use the following to retrieve credentials:"
    echo ""
    echo "  Consumer Key:    Retrieve from Setup > App Manager > $APP_LABEL > View"
    echo "  Consumer Secret: Retrieve from Setup > App Manager > $APP_LABEL > Manage Consumer Details"
    echo ""
    info "Or use this command:"
    echo "  sf org open $ORG_FLAG --path '/lightning/setup/NavigationMenus/home'"
else
    warn "Connected App not found via Tooling API query."
fi

# ---------------------------------------------------------------------------
# Step 4: Configure Client Credentials Flow User
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 4: Client Credentials Flow Setup"
info "=========================================="

echo ""
info "IMPORTANT: For OAuth Client Credentials flow, you must assign a 'Run As' user."
info "This cannot be done via API -- it must be configured in Setup."
echo ""
echo "Manual steps required:"
echo ""
echo "  1. Go to Setup > App Manager"
echo "  2. Find '$APP_LABEL' and click the dropdown arrow > Manage"
echo "  3. Click 'Edit Policies'"
echo "  4. Under 'Client Credentials Flow':"
echo "     - Set 'Run As' to the integration user (e.g., $USERNAME)"
echo "  5. Under 'OAuth Policies':"
echo "     - Set 'Permitted Users' to 'Admin approved users are pre-authorized'"
echo "     - Set 'IP Relaxation' to 'Relax IP restrictions'"
echo "  6. Click Save"
echo ""
echo "  7. Under 'Permission Sets' or 'Profiles', add the appropriate"
echo "     permission set or profile for the integration user."
echo ""

# ---------------------------------------------------------------------------
# Step 5: Test the Connection
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 5: Test Client Credentials Flow"
info "=========================================="

echo ""
echo "Once you have the Consumer Key and Secret, test with:"
echo ""
echo "  curl -X POST '$INSTANCE_URL/services/oauth2/token' \\"
echo "    -d 'grant_type=client_credentials' \\"
echo "    -d 'client_id=<CONSUMER_KEY>' \\"
echo "    -d 'client_secret=<CONSUMER_SECRET>'"
echo ""
echo "Expected response: JSON with 'access_token', 'instance_url', 'token_type'"
echo ""

# ---------------------------------------------------------------------------
# Step 6: Set Heroku Config Vars
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Step 6: Heroku Environment Variables"
info "=========================================="

echo ""
echo "Set these config vars on the Heroku app:"
echo ""
echo "  heroku config:set SF_LOGIN_URL='$INSTANCE_URL' -a siemens-eda-hav"
echo "  heroku config:set SF_CLIENT_ID='<CONSUMER_KEY>' -a siemens-eda-hav"
echo "  heroku config:set SF_CLIENT_SECRET='<CONSUMER_SECRET>' -a siemens-eda-hav"
echo ""
echo "For local development (.env file):"
echo ""
echo "  SF_LOGIN_URL=$INSTANCE_URL"
echo "  SF_CLIENT_ID=<CONSUMER_KEY>"
echo "  SF_CLIENT_SECRET=<CONSUMER_SECRET>"
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
info "=========================================="
info "Summary"
info "=========================================="
echo ""
success "CORS whitelist origins: deployed (or instructions provided)"
info "Connected App: created via metadata deploy (or manual steps above)"
warn "Action required: Configure 'Run As' user in Setup > App Manager"
warn "Action required: Retrieve Consumer Key/Secret from Setup"
warn "Action required: Set Heroku config vars"
echo ""
info "For the full manual walkthrough, see:"
info "  Setup > Apps > App Manager > New Connected App"
echo ""
