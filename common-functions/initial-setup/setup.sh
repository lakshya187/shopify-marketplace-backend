echo "Starting initial setup... -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-"

echo "Setting up prettier..."
echo "Installing Prettier..."
npm install --save-dev --save-exact prettier
touch .prettierrc.json .prettierignore
echo "Created .prettierrc.json and .prettierignore, please add files / folders to ignore in .prettierignore. Make sure to add build directories in .prettierignore"
cat > ./.prettierrc.json << EOF
{
  "trailingComma": "all",
  "tabWidth": 2,
  "singleQuote": false
}
EOF
npm pkg set scripts.format="prettier --write ."

echo "Setting up EsLint..."
echo "Installing ESLint..."
npm install --save-dev eslint eslint-config-airbnb eslint-config-prettier eslint-config-airbnb-base eslint-plugin-prettier eslint-plugin-import eslint-import-resolver-alias
touch .eslintrc.json .eslintignore
echo "Created .eslintrc.json and .eslintignore, please add files / folders to ignore in .eslintignore. Make sure to add build directories in .eslintignore"
cat > ./.eslintrc.json << EOF
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": ["airbnb", "plugin:prettier/recommended", "plugin:import/recommended"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["prettier", "import"],
  "rules": {
    "import/extensions": "off",
    "import/no-extraneous-dependencies": "off",
    "default-param-last": "off",
    "import/prefer-default-export": "off",
    "prettier/prettier": "off",
    "no-use-before-define": [
      "error",
      {
        "functions": false,
        "classes": true,
        "variables": true,
        "allowNamedExports": false
      }
    ]
  },
  "overrides": [
    {
      "files": ["./common-functions/**/*.js"],
      "rules": {
        "import/no-unresolved": "off"
      }
    }
  ],
  "settings": {
    "import/resolver": {
      "alias": {
        "map": []
      }
    }
  }
}

EOF
npm pkg set scripts.lint="eslint ."

echo "Setting up husky..."
echo "Installing husky..."
npm install --save-dev husky
npx husky install
npm pkg set scripts.prepare="husky install"
npx husky add .husky/pre-commit "npm run format && npm run lint"
echo "Installed husky, please add hooks in .husky folder"

echo "Initial setup complete!!! -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-"