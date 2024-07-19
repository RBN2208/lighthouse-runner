import fs from 'fs';
import lighthouse from 'lighthouse';
import {launch as chromeLauncher} from 'chrome-launcher';

import MOBILE_CONFIG from 'lighthouse/core/config/lr-mobile-config.js';
import DESKTOP_CONFIG from 'lighthouse/core/config/lr-desktop-config.js'

import {RUNNER_CONFIG,} from './lighthouse_config.js';

let TIMESTAMP = Date.now();
let DIRECTORY = "./reports/results_" + TIMESTAMP;
let RESULTS = {};

let CHROME_INSTANCE = null;

/**
 * runs a single lighthouse test
 *
 * @param {string} url page to test
 * @param {int} run number, the current run index
 * @param {boolean} isMobile
 * @returns
 */
 const executeTest = async (url, run, isMobile) => {
	const runnerResult = await lighthouse(url, {
		onlyCategories: RUNNER_CONFIG.LIGHTHOUSE.CATEGORIES,
    output: 'html',
    port: RUNNER_CONFIG.CHROME.START ? CHROME_INSTANCE.port : RUNNER_CONFIG.CHROME.PORT,
    extraHeaders: RUNNER_CONFIG.CHROME.ADD_HEADER && RUNNER_CONFIG.SETUP.SYSTEM.AUTH_HEADER != null ? {
      'x-develop-loadtest-auth': RUNNER_CONFIG.SETUP.SYSTEM.AUTH_HEADER
    }: {}
  }, isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG);
	runnerResult.lhr.outputReport = url.replace(/\/|:/g, '-') + '__' + (isMobile ? 'mobile' : 'desktop') + '__' + run + '.html';
 	console.log(runnerResult)

	fs.writeFileSync(DIRECTORY + '/' + runnerResult.lhr.outputReport, runnerResult.report);

	// `.lhr` is the Lighthouse Result as a JS object
	console.log('    report saved as ' + DIRECTORY + '/' + runnerResult.lhr.outputReport);

	return runnerResult.lhr;
}

const cleanReport = (report) => {
	delete report.stackPacks;
    delete report.i18n;
    delete report.timing;
    delete report.categoryGroups;
	return report;
}

/**
 * get the useful values out of the Lighthouse report
 *
 * @param {LH report object} report
 * @returns an optimized object for easier readability
 */
const optimizeReport = (report) => {
	let result = {
		time: report.fetchTime,
		categories: {},
		audits: {}
	};
	for (const key in report.categories) {
		result.categories[key] = report.categories[key].score || null;
	}

	for (const key in report.audits) {
		// the results. we just collect audits with a score of 0.  1: passed, 0: failed, null: not-checked
		if (report.audits[key].score === 0) {
			result.audits[key] = report.audits[key] || null;
		}
	}
	return result;
}

/**
 * combine all single results into a summary result
 */
const calculateResults = () => {
	console.log('\n====== calulcate results')
	for (const PAGE in RESULTS) {
		console.log("process results for " + PAGE)
		//run for mobile and desktop

		for (const device in RESULTS[PAGE].results) {
			let summary = {categories: {}, audits: {}};
			//iterate over all single results
			console.log(' - process ' + RESULTS[PAGE].results[device].length + ' ' + device + ' results');
			for (const singleResults of RESULTS[PAGE].results[device]) {
				//combine categories
				console.log(' - processing single result')
				for (const categoryKey in singleResults.categories) {
					summary.categories[categoryKey] = summary.categories[categoryKey] || 0;
					if (singleResults.categories[categoryKey] != null) {
						summary.categories[categoryKey] += singleResults.categories[categoryKey];
					}
				}
				//combine audits
				for (const auditKey in singleResults.audits) {
					summary.audits[auditKey] = summary.audits[auditKey] || 0;
					if (singleResults.audits[auditKey] != null) {
						summary.audits[auditKey] += singleResults.audits[auditKey];
					}
				}
			}
			console.log(' - calculate summary');

			//summarized results / number of results
			for (const propertyKey in summary.categories) {
				summary.categories[propertyKey] = summary.categories[propertyKey] / RUNNER_CONFIG.RUNS;
			}
			for (const propertyKey in summary.audits) {
				summary.audits[propertyKey] = summary.audits[propertyKey] / RUNNER_CONFIG.RUNS;
			}
			RESULTS[PAGE].summary[device] = summary;
		}
	}
	console.log('summary done.');
}

const toSimpleResult = (obj) => {
	for (const PAGE in obj) {
		delete obj[PAGE].raw
	}
	return obj;
}

/**
 * Main logic
 */
export async function runner() {
	console.log("=== RUNNING TESTS FOR " + RUNNER_CONFIG.SETUP.SYSTEM.PAGES.length + " URL(S), REPEATING "+ RUNNER_CONFIG.RUNS + " TIME(S)");
	console.log("    results will be written to directory " + DIRECTORY);

	fs.mkdirSync(DIRECTORY);

	//launch chrome
	if (RUNNER_CONFIG.CHROME.START) {
		CHROME_INSTANCE = await chromeLauncher({
			chromeFlags: [RUNNER_CONFIG.CHROME.HEADLESS ? '--headless' : '']
		});
	}

	for (let i=1; i <= RUNNER_CONFIG.RUNS; i++) {

		for (const PAGE of RUNNER_CONFIG.SETUP.SYSTEM.PAGES) {

			console.log('\n====== RUN #' + i + " for " + PAGE);

			RESULTS[PAGE] = RESULTS[PAGE] || {
				results: {
					mobile: [],
					desktop: [],
				},
				raw: {
					mobile: [],
					desktop: []
				},
				summary: {
					mobile: {},
					desktop: {}
				}
			};

			console.log(" -  mobile test started");
			const lhrMobile = await executeTest(PAGE, i, true);
			RESULTS[PAGE].raw.mobile.push(cleanReport(lhrMobile));
			RESULTS[PAGE].results.mobile.push(optimizeReport(lhrMobile));
			console.log(" -> completed");

			console.log(" -  desktop test started");
			const lhrDesktop = await executeTest(PAGE, i, false);
			RESULTS[PAGE].raw.desktop.push(cleanReport(lhrDesktop));
			RESULTS[PAGE].results.desktop.push(optimizeReport(lhrDesktop));
			console.log(" -> completed");
		}
	}

	calculateResults();

	fs.writeFileSync(DIRECTORY	+ "/results-" + TIMESTAMP + ".json", JSON.stringify(toSimpleResult(RESULTS), null, 2), "utf8");
	console.log('\nall test results written to files. DONE');
}
