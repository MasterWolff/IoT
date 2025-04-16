#!/bin/bash

# Read .env.local file and add each variable to Vercel
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^# ]]; then
    continue
  fi
  
  # Extract variable name and value
  var_name=$(echo "$line" | cut -d '=' -f 1)
  var_value=$(echo "$line" | cut -d '=' -f 2-)
  
  # Remove quotes if present
  var_value=$(echo "$var_value" | sed 's/^"//g' | sed 's/"$//g')
  
  echo "Adding $var_name to Vercel..."
  echo "$var_value" | vercel env add "$var_name" production
done < .env.local

echo "All environment variables have been added to Vercel!" 