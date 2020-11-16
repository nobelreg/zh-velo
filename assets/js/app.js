import { fetchData } from './queries.js';
import { loadMap, mapViewReset } from './map.js';

window.addEventListener('DOMContentLoaded', init);

window.addEventListener('online',  updateIndicator);
window.addEventListener('offline', updateIndicator);
updateIndicator();

/* handling on-/offline */
function updateIndicator() {

	if (!navigator.onLine) {
		addOfflineInfoTxt();
	}
	document.body.classList.toggle('body--offline', !navigator.onLine);
}

/* after DOM ready / only once (initially) */
function init() {
	if (navigator.onLine) { // we're online :)
		// initially we always show	"std"
		fetchData('std');
		loadMap();
		loadNaviListener();
		
		loadServiceWorker();
		handleA2HSButton();
	}	
}

/* handling top navigation */
const loadNaviListener = () => {
	const naviLinks = document.querySelectorAll('#navi a'); // document.getElementById('navi').getElementsByTagName('a');	// <-- safari doesn't understand :(
	let target = 'std';
	const loadingImg = document.getElementById('loading');
	
	for (const link of naviLinks) {
  	link.addEventListener('click', (e) => {
  		e.preventDefault();

			for (const link of naviLinks) {
				if (e.target != link) {
					link.classList.remove('active');
				} else {
					target = e.target.attributes.class.textContent;
					const info_txt = document.querySelector('.js-days-info').classList;

					document.getElementById('canvas').classList.add('h-element--half-transparent');	
					document.getElementById('loading').classList.remove('h-element--hide');			
					if (target == 'std') {
						fetchData('std')
						info_txt.add('h-element--hide');
					} else if (target == 'day') {						
						fetchData('day')
						info_txt.remove('h-element--hide');
					} else if (target == 'mon') {
						fetchData('mon')
						info_txt.add('h-element--hide');
					}
					e.target.classList.add('active');
					mapViewReset();
				}
			}		
  	});
	}
}

/* "active" navi element */
const getCurrentItem = () => {
	return document.querySelector('.navi__item .active').getAttribute('href').substr(1);
}

/* info on network status */
const addOfflineInfoTxt = () => {
	// only if this happens for the first time
	if (!document.getElementById('loading').hasChildNodes('p')) {
		const p = document.createElement('p');
		p.appendChild(document.createTextNode('Leider ist in diesem Moment kein Netz verfügbar.'));
		document.getElementById('loading').appendChild(p);
	}
}

/* handling caches / offline availability */
const loadServiceWorker = () => {
	if('serviceWorker' in navigator) {
		/** in case ...
		navigator.serviceWorker.getRegistrations()
			.then(reg => { // console.log(reg)
			for(let registration of reg) { 
				registration.unregister(); 
	  	} });
		*/
	
		navigator.serviceWorker
			// .register('/js/sw.js')
			.register('/sw.js') // needs to be at root level :/
			.then(() => { 
				console.log('Service Worker Registered'); 
			}).catch(err => {
				console.log('Service worker registration failed: ', err);
			});
	}
}

const handleA2HSButton = () => {
	const NOW = new Date();
	let installPrompt = JSON.parse(localStorage.getItem("zhVelo.installPrompt")) || null;
	if (installPrompt === null) { // it was never dismissed :)
		showA2HSButton(0, NOW);
	} else if(installPrompt.counter < 3) { // we show it 3 times
		const NOW = new Date(); // one day = 24 * 60 * 60 * 1000 = 86400000 (in ms)
		const diff = (Date.parse(NOW) - Date.parse(installPrompt.date)) / 86400000; 
		console.log('diff', diff)
		if (installPrompt.counter == 0 && diff > 4		// 0 => after 5 days
		|| installPrompt.counter == 1 && diff > 9 		// 1 => after 10 days
		|| installPrompt.counter == 2 && diff > 29) { // 2 => after 30 days 
			// show prompt
			showA2HSButton((installPrompt.counter + 1), NOW);
		}
	}
}

/* installation */
const showA2HSButton = (counter = 0, date = null) => {

	let deferredPrompt;
	window.addEventListener('beforeinstallprompt', (e) => {
		// no prompt for "older" browsers
		e.preventDefault();
		// stashing event so it can be triggered later
		deferredPrompt = e;
		
		// only if there isn't one yet
		if (document.getElementsByClassName('button').length === 0) {
		
			// provide a A2HS button
			const addBtn = document.createElement('button');
			Object.assign(addBtn, {
				className: 'button',
				value: 'Zu Homescreen hinzufügen',
			});
			document.body.appendChild(addBtn);

			addBtn.addEventListener('click', (e) => {
				// hide button
				addBtn.classList.add('h-element--hide');
				// show prompt
				deferredPrompt.prompt();
				// wait for user to respond to prompt
			
				deferredPrompt.userChoice.then((choiceResult) => {

					if (choiceResult.outcome === 'accepted') {
						console.log('prompt accepted');
					} else {
						console.log('prompt dismissed');
						localStorage.setItem("zhVelo.installPrompt", JSON.stringify({'counter': counter, 'date': date}))
					}
					deferredPrompt = null;
				});
			});	
		}
	});
}