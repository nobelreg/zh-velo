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
		
		// loadServiceWorker();
		addToHomescreenButton();
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
					const info_txt = document.getElementById('info').children[1].classList;

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
		p.appendChild(document.createTextNode('Leider ist in diesem Moment kein Netz verfügbar.')); // sure?
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

/* installation */
const addToHomescreenButton = () => {
	let deferredPrompt;

	window.addEventListener('beforeinstallprompt', (e) => {
		// Prevent Chrome 67 and earlier from automatically showing the prompt
		e.preventDefault();
		// Stash the event so it can be triggered later.
		deferredPrompt = e;
		// Update UI to notify the user they can add to home screen	
		const addBtn = document.createElement('button');	 
		Object.assign(addBtn, {
			className: 'button',
			value: 'Zu Homescreen hinzufügen',
		})	 
		document.body.appendChild(addBtn);

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
}