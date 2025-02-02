/**
 * @jest-environment jest-environment-puppeteer
 */

/* eslint-disable node/no-process-env */

// import primitives
import process from "node:process";
import console from "node:console";
import {URL, fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {ChildProcess, fork} from "node:child_process";
import {stat, rm} from "node:fs/promises";

// import modules
import "jest-puppeteer";
import "expect-puppeteer";
import {beforeAll, describe, it, afterAll} from "@jest/globals";
import {config} from "dotenv";

// retrieve current folder
const dirName = fileURLToPath(new URL(`.`, import.meta.url));

// use dotenv to load config file into process.env
config({path: resolve(dirName, `..`, `.env.files`, `.env.${ String(process.env.NODE_ENV) }`)});

const
    // destructure config values - since the e2e tests run against
    // the project build, I prefer not to use the server config for
    // it would require importing a module from the source files ...
    {APP_HOST, APP_PORT, APP_ENABLE_HTTPS, APP_UPLOAD_DIR} = process.env as Record<string, string>,
    // homepage url (no typescript ...)
    homepageUrl = `${ typeof APP_ENABLE_HTTPS === `string` && APP_ENABLE_HTTPS === `true` ? `https` : `http` }://${ APP_HOST }:${ APP_PORT }`,
    // create abort controller
    controller: AbortController = new AbortController();

describe(`app integration tests suite`, (): void => {
    // setup
    beforeAll(async(): Promise<void> => {
        console.log(`starting app ... ${ homepageUrl }`);

        // start app
        const testApp: ChildProcess = fork(`dist/server.js`, {
            // submit to abort controller signal for termination
            signal: controller.signal,
            // not-so-obvious default option
            env: process.env,
            // use SIGTERM
            killSignal: `SIGTERM`,
            // mute app output
            stdio: `ignore`
        });

        testApp
            // termination handler
            .on(`error`, e => {console.error(`express server shut down: ${ e.message }\n${ String(controller.signal.reason) }`);});

        // let's give the app one second to breathe ...
        await new Promise(r => {setTimeout(r, 1e3);});

        // navigate to home page (all tests will run on a single page load) ...
        await page.goto(homepageUrl);
    });

    describe(`when navigating to the home page`, (): void => {

        // test /fetch/inline route
        it(`should display a random string of length 48`, async(): Promise<void> => {
            await expect(page).toMatchTextContent(/[0-9a-f]{48}/ui, {timeout: 5e3});
        });

        // test button
        it(`should display a 'request token' button`, async() => {
            await expect(page).toMatchTextContent(`request a token`, {timeout: 5e3});
        });

        // test /protected route (no token)
        it(`should display an 'access to protected resources denied' message`, async() => {
            await expect(page).toMatchTextContent(`you are not allowed to access this resource 😬`, {timeout: 5e3});
        });

        // test file input
        it(`should display a 'browse for a file' button`, async() => {
            await expect(page).toMatchElement(`input[name="afile"]`, {timeout: 5e3});
        });

        // test button
        it(`should display an 'upload file' button`, async() => {
            await expect(page).toMatchElement(`input[type="submit"]`, {timeout: 5e3});
        });

        // test vite logo
        it(`should display the vite.js logo`, async() => {
            await expect(page).toMatchElement(`img.logo`, {timeout: 5e3});
        });

        // test pepe
        it(`should display some pepe ASCII art`, async() => {
            await expect(page).toMatchElement(`textarea#pepe`, {timeout: 5e3});
        });

    });

    describe(`when requesting a token`, (): void => {
        // test /protected route (with token)
        it(`should display an 'access to protected resources allowed' message`, async(): Promise<void> => {
            await expect(page).toClick(`button#tokenplease`, {text: `request a token`, timeout: 5e3});
            await expect(page).toMatchTextContent(`you now have access to protected resources 😎`, {timeout: 5e3});
        });
    });

    describe(`when uploading a file`, (): void => {
        // test /upload route
        it(`should upload the file to the server "${ APP_UPLOAD_DIR }" folder`, async(): Promise<void> => {
            await expect(page).toUploadFile(`input[name="afile"]`, resolve(dirName, `..`, `README.md`));
            await expect(page).toClick(`input[type="submit"]`);

            // let's give the app one second to breathe ...
            await new Promise(r => {setTimeout(r, 1e3);});

            // stat uploaded file (will throw if file upload failed ...)
            await stat(resolve(dirName, `..`, `dist`, APP_UPLOAD_DIR, `README.md`));
        });
    });

    // teardown
    afterAll(async(): Promise<void> => {
        // remove uploaded file
        await rm(resolve(dirName, `..`, `dist`, APP_UPLOAD_DIR, `README.md`), {force: true});
        // send abort signal to app
        console.log(`stopping app ...`);
        controller.abort(`tests are completed`);
    });
});