const core = require('@actions/core');
const AWS = require('aws-sdk')
const fs = require('fs')

AWS.config.update({ region: REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const s3Client = new AWS.S3({ apiVersion: '2012-08-10' });
var BUCKET;
var REGION;

(async () => {
    try {
        const repositoryName = core.getInput('repository-name');
        const repositoryVersion = core.getInput('repository-version');
        const reportId = core.getInput('report-id');
        const tableName = core.getInput('table-name');
        BUCKET = core.getInput('bucket-name');
        REGION = core.getInput('region');

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
    let projectsChangeLog = await uploadChangelogs(projectLocations, repositoryName)

    const date = new Date().toISOString()

    console.info(`Repository version: ${repositoryVersion}`)

    let versionDetails = {
        'repository': repositoryName,
        'version': repositoryVersion,
        'projects': {},
        'repository_projects': projects,
        'projects_changelog': projectsChangeLog
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
async function uploadChangelogs(projectLocations, repositoryName) {
    let projects = {}
    for (let i = 0; i < projectLocations.length; i++) {
        const project = projectLocations[i]
        let projectFolder = project['projectFolder']
        let name = JSON.parse(fs.readFileSync(`${projectFolder}/package.json`)).name
        let dirs = fs.readdirSync(projectFolder)
        let changelogFileLocations = dirs.filter(val => val.startsWith('CHANGELOG.'))
        projects[name] = {}
        for (let i = 0; i < changelogFileLocations.length; i++) {
            const changelogFileLocation = `${projectFolder}/${changelogFileLocations[i]}`
            if (fs.existsSync(changelogFileLocation)) {
                await s3Client.putObject({
                    Bucket: BUCKET,
                    Key: `changelogs/${repositoryName}/${name}-${changelogFileLocations[i]}`,
                    Body: fs.readFileSync(changelogFileLocation)
                }).promise()
                projects[name][changelogFileLocations[i].split('.').pop()] = `https://${BUCKET}.s3.${REGION}.amazonaws.com/changelogs/${repositoryName}/${name}-${changelogFileLocations[i]}`
            }
            else {
                console.log(`File does not exsits: ${changelogFileLocation}`);
            }
        }
    }
    return projects
}
