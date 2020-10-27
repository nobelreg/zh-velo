import { drawChart, cloneAndReplace } from './chart.js';
import { fetchYesterday, fetchLastWeek, fetchYearByMonths } from './queries.js';
import { loadMap, mapViewReset } from './map.js';
// import { statSelection } from './map.js';

window.addEventListener('DOMContentLoaded', init);

function init() {
	
	// console.log('online', online)
	if (navigator.onLine) { // we're online :)
		fetchYesterday();
		// fetchYearByMonths();
		loadMap();
		loadEventListeners();
	} else { // we show something else ...
		
		// navi could go
		document.querySelector('.content').classList.add('content--offline');
		const p = document.createElement('p');
		const txt = document.createTextNode('Leider ist in diesem Moment kein Netz verfügbar.');
		p.appendChild(txt); // sure?
		document.getElementById('loading').appendChild(p);
	}
	
	// prefixScript('https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js');
	// let scripts = [{'https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js', {'':''}}, {'js/map.js', {'type':'module'}];
	
	// let script = document.createElement('script');
	// script.src = 'https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js';
	// document.body.appendChild(script);
	
	loadServiceWorker();	
}

const loadEventListeners = () => {
	const naviLinks = document.querySelectorAll('#navi a'); // document.getElementById('navi').getElementsByTagName('a');	// <-- safari doesn't understand :(
	let target = 'std';
	let link;
	const loadingImg = document.getElementById('loading');
	
	for (const link of naviLinks) {
  	link.addEventListener('click', (e) => {
  		e.preventDefault();

			for (const link of naviLinks) {
				if (e.target != link) {
					link.classList.remove('active');
				} else {
					target = e.target.attributes.class.textContent;
					const info_txt = document.getElementById('info').children[1].classList;

					document.getElementById('canvas').classList.add('h-element--half-transparent');	
					document.getElementById('loading').classList.remove('h-element--hide');			
					if (target == 'std') {
						fetchYesterday();
						info_txt.add('h-element--hide');
					} else if (target == 'day') {						
						fetchLastWeek(); // days
						info_txt.remove('h-element--hide');
					} else if (target == 'mon') {
						fetchYearByMonths(); // mon
						info_txt.add('h-element--hide');
					}
					e.target.classList.add('active');
					mapViewReset();
				}
			}		
  	});
	}
}

const loadServiceWorker = () => {
	if('serviceWorker' in navigator) {
		navigator.serviceWorker
			 // .register('/js/sw.js')
			 .register('/sw.js') // needs to be at root level :/
			 .then(() => { 
					console.log('Service Worker Registered'); 
			 }).catch(err => {
					console.log('Service worker registration failed: ', err);
				});;
	}
}

const fetchZaehler = async (date) => {
	
	let query = '?sql=SELECT SUM("VELO_IN"::INTEGER) as velo, SUM("FUSS_IN"::INTEGER) as fuss, "FK_ZAEHLER" as zaehler FROM "b9308f85-9066-4f5b-8eab-344c790a6982" WHERE "DATUM" LIKE \'2020%\' GROUP BY zaehler';
 	 	
  const response = await fetch(url + query);
	if (response.status >= 200 && response.status <= 299) {
  	const jsonResponse = await response.json();
		console.log(jsonResponse.result.records.length, jsonResponse);
		let velo_arr = []; let fuss_arr = [];	
		
		jsonResponse.result.records.forEach((elm, i) => {
			if (elm.velo > 0) {
				console.log('velo', i)
				velo_arr[i] = elm.zaehler
			} 
			if (elm.fuss > 0) {
				console.log('fuss', i)
				fuss_arr[i] = elm.zaehler
			}
		});		
		console.log(velo_arr, fuss_arr)
		// drawChart(combination);
	} else { // Handle errors
  	console.log(response.status, response.statusText);
	}
}

// Register service worker to control making site work offline
/* if('serviceWorker' in navigator) {
  navigator.serviceWorker
           // .register('/js/sw.js')
           .register('/sw.js')
           .then(() => { 
           		console.log('Service Worker Registered'); 
           });
} */

/* installation */
let deferredPrompt;
// const addBtn = document.querySelector('.add-button');
const addBtn = document.querySelector('.add-button');
addBtn.style.display = 'none';

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI to notify the user they can add to home screen
  addBtn.style.display = 'block';

  addBtn.addEventListener('click', (e) => {
    // hide our user interface that shows our A2HS button
    addBtn.style.display = 'none';
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
      });
  });
});