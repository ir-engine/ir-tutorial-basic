# Ethereal Engine Basic

## Installation

1) Add Project to Ethereal Engine. All Ethereal Engine projects are mounted in the /packages/projects/projects sub-folder of Ethereal Engine. Using bash you could add this project using the following command:

```
cd etherealengine/packages/projects/projects
gh repo clone EtherealEngine/ir-tutorial-basic
cd ../../../
```

2) Make sure you are in the root folder for Ethereal. Then run Ethereal Engine itself. There are several ways to do this. With a fresh repo from github you could do the following (from the Ethereal folder):

```
npm install
npm run dev
```

3) From the web admin panel of Ethereal Engine create a 'location' for the project. See https://localhost:3000/admin . Map the project to the name 'basic'.

4) Run the project on the web by visiting it with the URL you created. See https://localhost:3000/location/basic
