simple nodejs tool to autogenerate lighthouse tests

# Install
- nvm use
- npm install
- npm run start

## CONFIG
current config is for accessibility testing multiple sites and collecting an overall score for these pages

further additions can be automatically transformed json to pdf with lists of failed audits etc


###
audits

each audit has a score, 1: passed, 0: failed, null: not present?
id, title, description, details: Object

RES.categories.accessibility
- title
- description
- score!
