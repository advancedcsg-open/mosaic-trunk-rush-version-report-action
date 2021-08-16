const core = require('@actions/core');
const AWS = require('aws-sdk')
const fs = require('fs')

const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

(async () => {
    try {
        const repositoryName = core.getInput('repository-name');
        const repositoryVersion = core.getInput('repository-version');
        const reportId = core.getInput('report-id');
        const tableName = core.getInput('table-name');

        let versionDetails = await processVersions(tableName, reportId, repositoryName, repositoryVersion)

        core.setOutput("version-details", versionDetails);
    } catch (error) {
        core.setFailed(error.message);
    }
})()


async function processVersions(tableName, reportId, repositoryName, repositoryVersion) {
    let rushFile = fs.readFileSync(`rush.json`)
    let rush = JSON.parse(rushFile)
    let projectLocations = rush["projects"]
    let projects = getProjectVersions(projectLocations)

    const date = new Date().toISOString()

    console.info(`Repository version: ${repositoryVersion}`)

    let versionDetails = {
        'repository': repositoryName,
        'version': repositoryVersion,
        'date': date,
        'projects': {},
        'repository_projects': projects
    }

    let dynamodbItem = {...versionDetails};
    dynamodbItem['PK'] = reportId
    dynamodbItem['SK'] = `PROJECTS#${repositoryName}#${repositoryVersion}`
    let params = {
        TableName: tableName,
        Item: dynamodbItem
    };

    dynamodb.put(params, function (err) {
        if (err) {
            throw err
        } else {
            console.log("Successfully added version");
        }
    });

    return versionDetails
}

function getProjectVersions(projectLocations) {
    let projects = {}
    projectLocations.forEach(function (project) {
        let projectFolder = project['projectFolder']
        let projectFileLocation = `${projectFolder}/package.json`
        let projectFile = fs.readFileSync(projectFileLocation)
        let packageData = JSON.parse(projectFile);
        let name = packageData['name']
        let version = packageData['version']
        projects[name] = version
        console.info(`Name: ${name}, version: ${version}`)
    })
    return projects
}