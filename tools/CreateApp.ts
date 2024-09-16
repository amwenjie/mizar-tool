#!/usr/bin/env node
'use strict';
import { execSync } from 'child_process';
import { blue, bold, cyan, green, red, yellow } from 'colorette';
import { Command } from 'commander';
import spawn from 'cross-spawn';
import dns from 'dns';
import envinfo from 'envinfo';
import fs from 'fs-extra';
import https from 'https';
import path from 'path';
import semver from 'semver';
import url, { fileURLToPath } from 'url';
import validateProjectName from 'validate-npm-package-name';
import Logger from "./libs/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = Logger("CreateApp");

const packageJson = fs.readJSONSync(path.resolve(__dirname, '../package.json'));

let projectName;

function getDependencies() {
    return Object.keys({
        "core-js": "~3.21.1",
        "mizar": "~1.0.0",
        "raf": "~3.4.1",
        "react": "~18.0.0",
        "react-dom": "~18.0.0",
        "react-redux": "~8.0.0",
        "react-router": "~6.3.0",
        "react-router-dom": "~6.3.0",
        "redux": "~4.1.2",
        "redux-thunk": "~2.4.1",
        "tslib": "~2.3.1"
    }).sort();
}

function init() {
    const createApp = new Command('create')
        // .version(packageJson.version)
        .arguments('<project-directory>')
        // .usage(`${green('<project-directory>')} [options]`)
        .action(name => {
            projectName = name;
        })
        .option('--verbose', 'print additional logs')
        .option('--info', 'print environment debug info')
        .option('--use-yarn')
        .option('--use-pnp')
        .allowUnknownOption()
        // .on('--help', () => {
        //     log.info(
        //         `    Only ${green('<project-directory>')} is required.`
        //     );
        //     console.log();
        //     log.info(
        //         `    If you have any problems, do not hesitate to file an issue:`
        //     );
        //     log.info(
        //         `      ${cyan(
        //             'https://github.com/amwenjie/alcor/issues/new'
        //         )}`
        //     );
        //     console.log();
        // })
        .parse(process.argv);

    const cmdOpts = createApp.opts();

    if (cmdOpts.info) {
        log.info(bold('\nEnvironment Info:'));
        log.info(
            `\n  current version of ${packageJson.name}: ${packageJson.version}`
        );
        log.info(`  running from ${path.resolve('./')}`);
        return envinfo
            .run(
                {
                    System: ['OS', 'CPU'],
                    Binaries: ['Node', 'npm', 'Yarn'],
                    Browsers: [
                        'Chrome',
                        'Edge',
                        'Internet Explorer',
                        'Firefox',
                        'Safari',
                    ],
                    // npmPackages: getDependencies(),
                    // npmGlobalPackages: ['alcor'],
                },
                {
                    duplicates: true,
                    showNotFound: true,
                }
            )
            .then((msg, ...args) => {
                log.info(msg, ...args);
            });
    }

    if (typeof projectName === 'undefined') {
        log.error('Please specify the project directory:');
        log.info(
            `  ${cyan(createApp.name())} ${green('<project-directory>')}`
        );
        console.log();
        log.info('For example:');
        log.info(
            `  ${cyan(createApp.name())} ${green('my-mizar-app')}`
        );
        console.log();
        log.info(
            `Run ${cyan(`${createApp.name()} --help`)} to see all options.`
        );
        process.exit(1);
    }

    // We first check the registry directly via the API, and if that fails, we try
    // the slower `npm view [package] version` command.
    //
    // This is important for users in environments where direct access to npm is
    // blocked by a firewall, and packages are provided exclusively via a private
    // registry.
    checkForLatestVersion()
        .catch(() => {
            try {
                return execSync('npm view alcor version').toString().trim();
            } catch {
                return null;
            }
        })
        .then((latest: string) => {
            if (latest && semver.lt(packageJson.version, latest)) {
                console.log();
                log.error(
                    yellow(
                        `You are running \`alcor\` ${packageJson.version}, which is behind the latest release (${latest}).\n\n`
                    )
                );
                console.log();
                process.exit(1);
            } else {
                createMizarApp(
                    projectName,
                    cmdOpts.verbose,
                    cmdOpts.useYarn,
                    cmdOpts.usePnp
                );
            }
        })
        .catch(e => {
            log.error(red("Run 'checkForLatestVersion.then' raising an error: "), e);
        });
}

function createMizarApp(name, verbose, useYarn, usePnp) {
    const unsupportedNodeVersion = !semver.satisfies(process.version, packageJson.engines.node);
    if (unsupportedNodeVersion) {
        log.info(
            yellow(
                `You are using Node ${process.version} so the project will be bootstrapped with an old unsupported version of tools.\n\n` +
                `Please update to Node 10 or higher for a better, fully supported experience.\n`
            )
        );
    }

    const root = path.resolve(name);
    const appName = path.basename(root);

    checkAppName(appName);
    fs.ensureDirSync(name);
    if (!isSafeToCreateProjectIn(root, name)) {
        process.exit(1);
    }
    console.log();

    log.info(`Creating a new mizar app in ${green(root)}.`);
    console.log();

    const canUseYarn = useYarn && shouldUseYarn();
    const originalDirectory = process.cwd();
    process.chdir(root);
    if (!canUseYarn && !checkThatNpmCanReadCwd()) {
        process.exit(1);
    }

    if (!canUseYarn) {
        const npmInfo = checkNpmVersion();
        if (!npmInfo.hasMinNpm) {
            if (npmInfo.npmVersion) {
                log.info(
                    yellow(
                        `You are using npm ${npmInfo.npmVersion} so the project will be bootstrapped with an old unsupported version of tools.\n\n` +
                        `Please update to npm 6 or higher for a better, fully supported experience.\n`
                    )
                );
            }
        }
    } else if (usePnp) {
        const yarnInfo = checkYarnVersion();
        if (yarnInfo.yarnVersion) {
            if (!yarnInfo.hasMinYarnPnp) {
                log.info(
                    yellow(
                        `You are using Yarn ${yarnInfo.yarnVersion} together with the --use-pnp flag, but Plug'n'Play is only supported starting from the 1.12 release.\n\n` +
                        `Please update to Yarn 1.12 or higher for a better, fully supported experience.\n`
                    )
                );
                // 1.11 had an issue with webpack-dev-middleware, so better not use PnP with it (never reached stable, but still)
                usePnp = false;
            }
            if (!yarnInfo.hasMaxYarnPnp) {
                log.info(
                    yellow(
                        'The --use-pnp flag is no longer necessary with yarn 2 and will be deprecated and removed in a future release.\n'
                    )
                );
                // 2 supports PnP by default and breaks when trying to use the flag
                usePnp = false;
            }
        }
    }

    // if (canUseYarn) {
    //     let yarnUsesDefaultRegistry = true;
    //     try {
    //         yarnUsesDefaultRegistry =
    //             execSync('yarnpkg config get registry').toString().trim() ===
    //             'https://registry.yarnpkg.com';
    //     } catch (e) {
    //         // ignore
    //     }
    //     if (yarnUsesDefaultRegistry) {
    //         fs.copySync(
    //             require.resolve('./yarn.lock.cached'),
    //             path.join(root, 'yarn.lock')
    //         );
    //     }
    // }

    run(
        root,
        appName,
        verbose,
        originalDirectory,
        canUseYarn,
        usePnp
    );
}

function shouldUseYarn() {
    try {
        execSync('yarnpkg --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function install(root, canUseYarn, usePnp, dependencies, verbose, isOnline) {
    return new Promise((resolve, reject) => {
        let command;
        let args;
        if (canUseYarn) {
            command = 'yarnpkg';
            // args = ['add', '--exact'];
            args = ['-i'];
            if (!isOnline) {
                args.push('--offline');
            }
            if (usePnp) {
                args.push('--enable-pnp');
            }
            [].push.apply(args, dependencies);

            // Explicitly set cwd() to work around issues like
            // https://github.com/facebook/create-react-app/issues/3326.
            // Unfortunately we can only do this for Yarn because npm support for
            // equivalent --prefix flag doesn't help with this issue.
            // This is why for npm, we run checkThatNpmCanReadCwd() early instead.
            args.push('--cwd');
            args.push(root);

            if (!isOnline) {
                log.info(yellow('You appear to be offline.'));
                log.info(yellow('Falling back to the local Yarn cache.'));
                console.log();
            }
        } else {
            command = 'npm';
            // args = [
            //     'install',
            //     '--save',
            //     '--save-exact',
            //     '--loglevel',
            //     'error',
            // ].concat(dependencies);
            args = [
                'install'
            ];

            if (usePnp) {
                log.info(yellow("NPM doesn't support PnP."));
                log.info(yellow('Falling back to the regular installs.'));
                console.log();
            }
        }

        if (verbose) {
            args.push('--verbose');
        }

        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('close', code => {
            if (code !== 0) {
                reject({
                    command: `${command} ${args.join(' ')}`,
                });
                return;
            }
            log.info(
                `The app ${green(path.basename(root))} is initialized success`
            );
            resolve(void 0);
        });
    });
}

function run(
    root,
    appName,
    verbose,
    originalDirectory,
    canUseYarn,
    usePnp
) {
    const allDependencies = getDependencies();

    log.info('Installing packages. This might take a couple of minutes.');
    checkIfOnline(canUseYarn)
        .then(isOnline => {
            fs.copySync(path.resolve(__dirname, "../packages/template-typescript"), "./")
        })
        .then((isOnline) => {
            return install(
                root,
                canUseYarn,
                usePnp,
                allDependencies,
                verbose,
                isOnline
            );
        })
        .catch(reason => {
            console.log();
            log.info('Aborting installation.');
            if (reason.command) {
                log.info(`  ${cyan(reason.command)} has failed.`);
            } else {
                log.info(
                    red('Unexpected error. Please report it as a bug:')
                );
                log.info(reason);
            }
            console.log();

            // On 'exit' we will delete these files from target directory.
            const knownGeneratedFiles = [
                'package.json',
                'yarn.lock',
                'node_modules',
            ];
            const currentFiles = fs.readdirSync(path.join(root));
            currentFiles.forEach(file => {
                knownGeneratedFiles.forEach(fileToMatch => {
                    // This removes all knownGeneratedFiles.
                    if (file === fileToMatch) {
                        log.info(`Deleting generated file... ${cyan(file)}`);
                        fs.removeSync(path.join(root, file));
                    }
                });
            });
            const remainingFiles = fs.readdirSync(path.join(root));
            if (!remainingFiles.length) {
                // Delete target folder if empty
                log.info(
                    `Deleting ${cyan(`${appName}/`)} from ${cyan(
                        path.resolve(root, '..')
                    )}`
                );
                process.chdir(path.resolve(root, '..'));
                fs.removeSync(path.join(root));
            }
            log.info('Done.');
            process.exit(1);
        });
}

function checkNpmVersion() {
    let hasMinNpm = false;
    let npmVersion = null;
    try {
        npmVersion = execSync('npm --version').toString().trim();
        hasMinNpm = semver.gte(npmVersion, '6.0.0');
    } catch {
        // ignore
    }
    return {
        hasMinNpm: hasMinNpm,
        npmVersion: npmVersion,
    };
}

function checkYarnVersion() {
    const minYarnPnp = '1.12.0';
    const maxYarnPnp = '2.0.0';
    let hasMinYarnPnp = false;
    let hasMaxYarnPnp = false;
    let yarnVersion = null;
    try {
        yarnVersion = execSync('yarnpkg --version').toString().trim();
        if (semver.valid(yarnVersion)) {
            hasMinYarnPnp = semver.gte(yarnVersion, minYarnPnp);
            hasMaxYarnPnp = semver.lt(yarnVersion, maxYarnPnp);
        } else {
            // Handle non-semver compliant yarn version strings, which yarn currently
            // uses for nightly builds. The regex truncates anything after the first
            // dash. See #5362.
            const trimmedYarnVersionMatch = /^(.+?)[-+].+$/.exec(yarnVersion);
            if (trimmedYarnVersionMatch) {
                const trimmedYarnVersion = trimmedYarnVersionMatch.pop();
                hasMinYarnPnp = semver.gte(trimmedYarnVersion, minYarnPnp);
                hasMaxYarnPnp = semver.lt(trimmedYarnVersion, maxYarnPnp);
            }
        }
    } catch {
        // ignore
    }
    return {
        hasMinYarnPnp: hasMinYarnPnp,
        hasMaxYarnPnp: hasMaxYarnPnp,
        yarnVersion: yarnVersion,
    };
}

function checkAppName(appName) {
    const validationResult = validateProjectName(appName);
    if (!validationResult.validForNewPackages) {
        log.error(
            red(
                `Cannot create a project named ${green(
                    `"${appName}"`
                )} because of npm naming restrictions:\n`
            )
        );
        [
            ...(validationResult.errors || []),
            ...(validationResult.warnings || []),
        ].forEach(error => {
            log.error(red(`  * ${error}`));
        });
        log.error(red('\nPlease choose a different project name.'));
        process.exit(1);
    }

    const dependencies = getDependencies();
    if (dependencies.includes(appName)) {
        log.error(
            red(
                `Cannot create a project named ${green(
                    `"${appName}"`
                )} because a dependency with the same name exists.\n` +
                `Due to the way npm works, the following names are not allowed:\n\n`
            ) +
            cyan(dependencies.map(depName => `  ${depName}`).join('\n')) +
            red('\n\nPlease choose a different project name.')
        );
        process.exit(1);
    }
}

// If project only contains files generated by GH, it’s safe.
// Also, if project contains remnant error logs from a previous
// installation, lets remove them now.
// We also special case IJ-based products .idea because it integrates with CRA:
// https://github.com/facebook/create-react-app/pull/368#issuecomment-243446094
function isSafeToCreateProjectIn(root, name) {
    const validFiles = [
        '.DS_Store',
        '.git',
        '.gitattributes',
        '.gitignore',
        '.gitlab-ci.yml',
        '.hg',
        '.hgcheck',
        '.hgignore',
        '.idea',
        '.npmignore',
        '.travis.yml',
        'docs',
        'LICENSE',
        'README.md',
        'mkdocs.yml',
        'Thumbs.db',
    ];
    // These files should be allowed to remain on a failed install, but then
    // silently removed during the next create.
    const errorLogFilePatterns = [
        'npm-debug.log',
        'yarn-error.log',
        'yarn-debug.log',
    ];
    const isErrorLog = file => {
        return errorLogFilePatterns.some(pattern => file.startsWith(pattern));
    };

    const conflicts = fs
        .readdirSync(root)
        .filter(file => !validFiles.includes(file))
        // IntelliJ IDEA creates module files before CRA is launched
        .filter(file => !/\.iml$/.test(file))
        // Don't treat log files from previous installation as conflicts
        .filter(file => !isErrorLog(file));

    if (conflicts.length > 0) {
        log.info(
            `The directory ${green(name)} contains files that could conflict:`
        );
        console.log();
        for (const file of conflicts) {
            try {
                const stats = fs.lstatSync(path.join(root, file));
                if (stats.isDirectory()) {
                    log.info(`  ${blue(`${file}/`)}`);
                } else {
                    log.info(`  ${file}`);
                }
            } catch {
                log.info(`  ${file}`);
            }
        }
        console.log();
        log.info(
            'Either try using a new directory name, or remove the files listed above.'
        );

        return false;
    }

    // Remove any log files from a previous installation.
    fs.readdirSync(root).forEach(file => {
        if (isErrorLog(file)) {
            fs.removeSync(path.join(root, file));
        }
    });
    return true;
}

function getProxy() {
    if (process.env.https_proxy) {
        return process.env.https_proxy;
    } else {
        try {
            // Trying to read https-proxy from .npmrc
            const httpsProxy = execSync('npm config get https-proxy').toString().trim();
            return httpsProxy !== 'null' ? httpsProxy : undefined;
        } catch {
            return;
        }
    }
}

// See https://github.com/facebook/create-react-app/pull/3355
function checkThatNpmCanReadCwd() {
    const cwd = process.cwd();
    let childOutput = null;
    try {
        // Note: intentionally using spawn over exec since
        // the problem doesn't reproduce otherwise.
        // `npm config list` is the only reliable way I could find
        // to reproduce the wrong path. Just printing process.cwd()
        // in a Node process was not enough.
        childOutput = spawn.sync('npm', ['config', 'list']).output.join('');
    } catch {
        // Something went wrong spawning node.
        // Not great, but it means we can't do this check.
        // We might fail later on, but let's continue.
        return true;
    }
    if (typeof childOutput !== 'string') {
        return true;
    }
    const lines = childOutput.split('\n');
    // `npm config list` output includes the following line:
    // "; cwd = C:\path\to\current\dir" (unquoted)
    // I couldn't find an easier way to get it.
    const prefix = '; cwd = ';
    const line = lines.find(line => line.startsWith(prefix));
    if (typeof line !== 'string') {
        // Fail gracefully. They could remove it.
        return true;
    }
    const npmCWD = line.substring(prefix.length);
    if (npmCWD === cwd) {
        return true;
    }
    log.error(
        red(
            `Could not start an npm process in the right directory.\n\n` +
            `The current directory is: ${bold(cwd)}\n` +
            `However, a newly started npm process runs in: ${bold(
                npmCWD
            )}\n\n` +
            `This is probably caused by a misconfigured system terminal shell.`
        )
    );
    if (process.platform === 'win32') {
        log.error(
            red(`On Windows, this can usually be fixed by running:\n\n`) +
            `  ${cyan(
                'reg'
            )} delete "HKCU\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n` +
            `  ${cyan(
                'reg'
            )} delete "HKLM\\Software\\Microsoft\\Command Processor" /v AutoRun /f\n\n` +
            red(`Try to run the above two lines in the terminal.\n`) +
            red(
                `To learn more about this problem, read: https://blogs.msdn.microsoft.com/oldnewthing/20071121-00/?p=24433/`
            )
        );
    }
    return false;
}

function checkIfOnline(useYarn) {
    if (!useYarn) {
        // Don't ping the Yarn registry.
        // We'll just assume the best case.
        return Promise.resolve(true);
    }

    return new Promise(resolve => {
        dns.lookup('registry.yarnpkg.com', err => {
            let proxy;
            if (err != null && (proxy = getProxy())) {
                // If a proxy is defined, we likely can't resolve external hostnames.
                // Try to resolve the proxy name as an indication of a connection.
                dns.lookup(url.parse(proxy).hostname, proxyErr => {
                    resolve(proxyErr == null);
                });
            } else {
                resolve(err == null);
            }
        });
    });
}

function checkForLatestVersion() {
    return new Promise((resolve, reject) => {
        https
            .get(
                'https://registry.npmjs.org/-/package/alcor/dist-tags',
                res => {
                    if (res.statusCode === 200) {
                        let body = '';
                        res.on('data', data => (body += data));
                        res.on('end', () => {
                            resolve(JSON.parse(body).latest);
                        });
                    } else {
                        reject();
                    }
                }
            )
            .on('error', () => {
                reject();
            });
    });
}

init();

// export function makeCreateAppCommand() {
//     const createApp = new commander.Command('create');
//     createApp
//         // .version(packageJson.version)
//         .arguments('<project-directory>')
//         .usage(`${green('<project-directory>')} [options]`)
//         // .action(name => {
//         //     projectName = name;
//         // })
//         .option('--verbose', 'print additional logs')
//         .option('--info', 'print environment debug info')
//         .option('--use-yarn')
//         .option('--use-pnp')
//         .allowUnknownOption()
//         .action((name, options) => {
//             projectName = name;
//             const cmdOpts = options;

//             if (cmdOpts.info) {
//                 log.info(bold('\nEnvironment Info:'));
//                 log.info(
//                     `\n  current version of ${packageJson.name}: ${packageJson.version}`
//                 );
//                 log.info(`  running from ${__dirname}`);
//                 return envinfo
//                     .run(
//                         {
//                             System: ['OS', 'CPU'],
//                             Binaries: ['Node', 'npm', 'Yarn'],
//                             Browsers: [
//                                 'Chrome',
//                                 'Edge',
//                                 'Internet Explorer',
//                                 'Firefox',
//                                 'Safari',
//                             ],
//                             // npmPackages: getDependencies(),
//                             // npmGlobalPackages: ['alcor'],
//                         },
//                         {
//                             duplicates: true,
//                             showNotFound: true,
//                         }
//                     )
//                     .then(log.log);
//             }

//             if (typeof projectName === 'undefined') {
//                 log.error('Please specify the project directory:');
//                 log.info(
//                     `  ${cyan(createApp.name())} ${green('<project-directory>')}`
//                 );
//                 console.log();
//                 log.info('For example:');
//                 log.info(
//                     `  ${cyan(createApp.name())} ${green('my-mizar-app')}`
//                 );
//                 console.log();
//                 log.info(
//                     `Run ${cyan(`${createApp.name()} --help`)} to see all options.`
//                 );
//                 process.exit(1);
//             }

//             // We first check the registry directly via the API, and if that fails, we try
//             // the slower `npm view [package] version` command.
//             //
//             // This is important for users in environments where direct access to npm is
//             // blocked by a firewall, and packages are provided exclusively via a private
//             // registry.
//             checkForLatestVersion()
//                 .catch(() => {
//                     try {
//                         return execSync('npm view alcor version').toString().trim();
//                     } catch (e) {
//                         return null;
//                     }
//                 })
//                 .then(latest => {
//                     if (latest && semver.lt(packageJson.version, latest)) {
//                         console.log();
//                         log.error(
//                             yellow(
//                                 `You are running \`alcor\` ${packageJson.version}, which is behind the latest release (${latest}).\n\n`
//                             )
//                         );
//                         console.log();
//                         process.exit(1);
//                     } else {
//                         createMizarApp(
//                             projectName,
//                             cmdOpts.verbose,
//                             cmdOpts.useYarn,
//                             cmdOpts.usePnp
//                         );
//                     }
//                 })
//                 .catch(e => {
//                     red("Run 'checkForLatestVersion.then' raising an error: ");
//                     log.error(e);
//                 });
//         });
//     return createApp;
// }