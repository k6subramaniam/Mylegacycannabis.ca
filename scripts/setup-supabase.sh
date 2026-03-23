#!/bin/bash
# ============================================================
# Supabase Database Setup Script for My Legacy Cannabis
# ============================================================
# This script helps you set up a free Supabase PostgreSQL database
# and configure it for your Railway deployment.
#
# Prerequisites:
#   1. A Supabase account (https://supabase.com - free tier works)
#   2. A Supabase access token (https://supabase.com/dashboard/account/tokens)
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=your_token ./scripts/setup-supabase.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  My Legacy Cannabis — Supabase DB Setup${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check for access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}No SUPABASE_ACCESS_TOKEN found.${NC}"
  echo ""
  echo "To get your access token:"
  echo "  1. Go to https://supabase.com/dashboard/account/tokens"
  echo "  2. Click 'Generate new token'"
  echo "  3. Give it a name (e.g., 'my-legacy-cannabis')"
  echo "  4. Copy the token"
  echo ""
  read -p "Paste your Supabase access token: " SUPABASE_ACCESS_TOKEN
  echo ""
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo -e "${RED}Error: Access token is required.${NC}"
  exit 1
fi

# Get organization ID
echo -e "${CYAN}Fetching your Supabase organizations...${NC}"
ORGS=$(curl -s "https://api.supabase.com/v1/organizations" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")

ORG_ID=$(echo "$ORGS" | python3 -c "
import json, sys
orgs = json.load(sys.stdin)
if isinstance(orgs, list) and len(orgs) > 0:
    print(orgs[0]['id'])
else:
    print('ERROR')
" 2>/dev/null)

if [ "$ORG_ID" == "ERROR" ] || [ -z "$ORG_ID" ]; then
  echo -e "${RED}Failed to fetch organizations. Check your access token.${NC}"
  echo "Response: $ORGS"
  exit 1
fi

echo -e "${GREEN}Found organization: $ORG_ID${NC}"

# Check existing projects
echo -e "${CYAN}Checking existing projects...${NC}"
PROJECTS=$(curl -s "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")

EXISTING=$(echo "$PROJECTS" | python3 -c "
import json, sys
projects = json.load(sys.stdin)
for p in projects:
    if 'legacy' in p.get('name', '').lower() or 'cannabis' in p.get('name', '').lower():
        print(f\"{p['id']}|{p['name']}|{p.get('region', 'unknown')}\")
        sys.exit(0)
print('NONE')
" 2>/dev/null)

if [ "$EXISTING" != "NONE" ] && [ -n "$EXISTING" ]; then
  PROJECT_ID=$(echo "$EXISTING" | cut -d'|' -f1)
  PROJECT_NAME=$(echo "$EXISTING" | cut -d'|' -f2)
  echo -e "${GREEN}Found existing project: $PROJECT_NAME ($PROJECT_ID)${NC}"
  echo ""
  read -p "Use this project? (y/n): " USE_EXISTING
  if [ "$USE_EXISTING" != "y" ]; then
    EXISTING="NONE"
  fi
fi

if [ "$EXISTING" == "NONE" ] || [ -z "$EXISTING" ]; then
  # Create a new project
  echo -e "${CYAN}Creating new Supabase project...${NC}"
  
  # Generate a secure DB password
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
  
  CREATE_RESULT=$(curl -s -X POST "https://api.supabase.com/v1/projects" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"organization_id\": \"$ORG_ID\",
      \"name\": \"my-legacy-cannabis\",
      \"db_pass\": \"$DB_PASSWORD\",
      \"region\": \"us-east-1\",
      \"plan\": \"free\"
    }")
  
  PROJECT_ID=$(echo "$CREATE_RESULT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('id', 'ERROR'))
" 2>/dev/null)
  
  if [ "$PROJECT_ID" == "ERROR" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project.${NC}"
    echo "Response: $CREATE_RESULT"
    exit 1
  fi
  
  echo -e "${GREEN}Project created: $PROJECT_ID${NC}"
  echo -e "${YELLOW}Waiting for project to be ready (this may take 1-2 minutes)...${NC}"
  
  for i in $(seq 1 24); do
    sleep 5
    STATUS=$(curl -s "https://api.supabase.com/v1/projects/$PROJECT_ID" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | \
      python3 -c "import json, sys; print(json.load(sys.stdin).get('status', 'UNKNOWN'))" 2>/dev/null)
    echo -e "  Status: $STATUS ($((i*5))s)"
    if [ "$STATUS" == "ACTIVE_HEALTHY" ]; then
      break
    fi
  done
  
  # Build the DATABASE_URL
  DATABASE_URL="postgresql://postgres.${PROJECT_ID}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
  
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  DATABASE CREATED SUCCESSFULLY!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo -e "${CYAN}DATABASE_URL:${NC}"
  echo "$DATABASE_URL"
  echo ""
else
  # Use existing project
  echo ""
  echo -e "${YELLOW}For an existing project, get the connection string from:${NC}"
  echo "  1. Go to https://supabase.com/dashboard/project/$PROJECT_ID/settings/database"
  echo "  2. Click 'URI' under 'Connection string'"
  echo "  3. Replace [YOUR-PASSWORD] with your database password"
  echo ""
  read -p "Paste your DATABASE_URL: " DATABASE_URL
fi

if [ -n "$DATABASE_URL" ]; then
  echo ""
  echo -e "${CYAN}Next steps:${NC}"
  echo ""
  echo "  1. Add DATABASE_URL to Railway:"
  echo "     railway variables set DATABASE_URL=\"$DATABASE_URL\""
  echo ""
  echo "  2. Or add to your .env file:"
  echo "     DATABASE_URL=$DATABASE_URL"
  echo ""
  echo "  3. Redeploy on Railway to activate persistent storage."
  echo ""
  
  read -p "Save DATABASE_URL to .env now? (y/n): " SAVE_ENV
  if [ "$SAVE_ENV" == "y" ]; then
    # Update .env file
    if grep -q "^DATABASE_URL=" .env 2>/dev/null; then
      sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
    else
      echo "DATABASE_URL=$DATABASE_URL" >> .env
    fi
    echo -e "${GREEN}Saved to .env!${NC}"
  fi
fi

echo ""
echo -e "${GREEN}Done! Your app will now use persistent PostgreSQL storage.${NC}"
echo -e "${YELLOW}Note: The app automatically creates all tables on first startup.${NC}"
