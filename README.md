# mosaic-trunk-rush-version-report-action
Creates a version report for a Rush project with a trunk based development approach.

## Inputs

### `report-id`

**Required** Name of the report. Needs to consist of `digits (0-9)`, `letters(A-Z, a-z)`, separated by `-`.

### `table-name`

Name of the table to hold the reports. Default `rush-version-reports`.

### `repository-name`

Name of the repository

### `repository-version`

Repository version

### `bucket-name`

Name of the bucket to upload changelog files.

### `region`

Region value. Default `eu-west-2`.

### `cf-distribution-name`

Name of the cloudfront distribution to access the url

## Outputs

### `version-details`

Project versions.

## Prerequisites
- Repository needs to have a `rush.json` file
- Dynamodb table needs to exist (sample template included in the files)
- Action needs to have basic write permissions on the table

## Example usage

```
uses: advancedcsg-open/mosaic-trunk-rush-version-report-action@v1.0
with:
    report-id: 'sample'
    repository-name: 'example-repo/project'
    repository-version: 'v1.0.0'
    bucket-name: 'example-changelogs-bucket'
```
