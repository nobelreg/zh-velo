export const drawChart = (input) => {
	
// fillColor: feature.properties.abkuerzung.substr(0,3) == 'VZS' ? "#4072B4" : '#9e9e9e',
// fillColor: feature.properties.abkuerzung.substr(0,3) == 'VZS' ? "#4072B4" : '#b0bec5', // '#9e9e9e',
// color: "#ccc",

	const datasets = [{
				label: 'Velofahrer',
				backgroundColor: '#4072B4', // gruen // backgroundColor: color('rgb(255, 99, 132)').alpha(0.5).rgbString(),
				// borderColor: 'rgb(129, 199, 132)',
				borderColor: '#ccc', // 'rgb(54, 162, 235)',
				borderWidth: .5,
				data: input.velo.arr
			}, {
				label: 'Fussgänger',
				backgroundColor: '#b0bec5', // '#9e9e9e', // blau // backgroundColor: color('rgb(54, 162, 235)').alpha(0.5).rgbString(),
				borderColor: '#ccc', // 'rgb(176, 190, 197)', // 'rgb(54, 162, 235)',
				borderWidth: .5,
				data: input.fuss.arr
			}];
	
	// if chart already available: just update content
	// if (window.myChart && typeof window.myBar === 'object') { 
	if (window.myChart) { 
		window.myChart.data.datasets = datasets;
		window.myChart.data.labels = input.labels;
		window.myChart.update();
		// window.myChart.clear();
		// window.myChart.destroy();
		
		return true;
	}

	const ctx = document.getElementById('canvas').getContext('2d');
	
  // Chart.defaults.global.defaultFontFamily = 'Varta';
  Chart.defaults.global.defaultFontFamily = 'Helvetica';
  return window.myChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: input.labels, // ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
			datasets: datasets
		},
		options: {
			// lineAt: 14,
			responsive: true,
			legend: { position: 'bottom', },
			title: {
				display: false,
				text: 'Langsamverkehr Zürich'
			},
			tooltips: {
			  cornerRadius: 2,
			  // bodyFontFamily: 'SRG_SSR_Light',
			  // bodyFontFamily: 'Varta',
				callbacks: {
					label: (tooltipItem, data) => {
						let label = ' ' + data.datasets[tooltipItem.datasetIndex].label || '';
						if (label) { label += ': '; }
						let str = tooltipItem.yLabel + '';
						return label += '' + str.replace(/\B(?=(\d{3})+(?!\d))/g, '\''); // Math.round(tooltipItem.yLabel * 100) / 100;
						// */ // console.log(tooltipItem, data)
					},
				},
			},
			scales: {
					yAxes: [{
							ticks: {
									// fontFamily: 'SRG_SSR_Regular',
									beginAtZero: true,
									padding: 5,
									callback: function(value, index, values) {
											let str = value + '';
											let len = str.length;
											return (str.indexOf('.') === -1 && len > 3) ? (value / 1000) + ' k' : value;
									}
							},
							gridLines: {
									// display: false
									// drawOnChartArea: false,
									zeroLineWidth: 1,
									drawTicks: true,
									tickMarkLength: 5,
									drawBorder: false,
							},
					}],
					xAxes: [{
							gridLines: {
									drawOnChartArea: false,
									zeroLineWidth: 1,
									drawTicks: true,
									tickMarkLength: 5,
									drawBorder: true,
							},
							ticks: {
									// fontFamily: 'SRG_SSR_Regular',
									padding: 3 // padding btw. tick & label txt
							}
					}],
					// responsive: false,
					maintainAspectRatio: false,
			}
		},
	});
}

export const cloneAndReplace = () => {
	/* let elm = document.getElementById("canvas");
	let clone = elm.cloneNode();
	let parent = elm.parentNode;
	parent.removeChild(elm);
	parent.appendChild(clone); */
}


const separateByThousands = (elm) => {
  return (typeof elm === 'number') ?
    elm.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1\ ') : '--';
};

