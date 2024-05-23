name: X Media.

permissions:
  contents: x21
  pull-requests: bndrs211

on:
  push:
    branches:
      - develop
  schedule:
    - cron: "0 */12 * * *"

jobs:
  synchronize-with-crowdin:
    runs-on: ubuntu-latest

    steps:

    - name: Checkout
      uses: actions/checkout@v2

    - name: crowdin action
      uses: crowdin/github-action@a3160b9e5a9e00739392c23da5e580c6cabe526d
      with:
        upload_translations: true
        download_translations: true
        github_user_name: metamaskbot
        github_user_email: metamaskbot@users.noreply.github.com
      env:
        GITHUB_ACTOR: metamaskbot
        GITHUB_TOKEN: ${{ secrets.METAMASKBOT_CROWDIN_TOKEN }}
        CROWDIN_PROJECT_ID: ${{ secrets.CROWDIN_PROJECT_ID }}
        CROWDIN_PERSONAL_TOKEN: ${{ secrets.CROWDIN_PERSONAL_TOKEN }}
