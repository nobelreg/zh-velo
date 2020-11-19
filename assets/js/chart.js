export const drawChart = (input) => {

  const datasets = [{
        label: 'Velo',
        backgroundColor: '#4072B4',
        borderColor: '#ccc',
        borderWidth: .5,
        data: input.velo.arr
      }, {
        label: 'Fussgänger',
        backgroundColor: '#B0BEC5',
        borderColor: '#ccc',
        borderWidth: .5,
        data: input.fuss.arr
      }];
      
  const config = {
    type: 'bar',
    data: {
      labels: input.labels,
      datasets: datasets
    },
    options: {
      avg: [input.velo.avg, input.fuss.avg],
      responsive: true,
      legend: { position: 'bottom', },
      title: {
        display: false,
        text: 'Langsamverkehr Zürich'
      },
      tooltips: {
        cornerRadius: 2,
        callbacks: {
          label: (tooltipItem, data) => {
            let label = ' ' + data.datasets[tooltipItem.datasetIndex].label || '';
            if (label) { label += ': '; }
            let str = tooltipItem.yLabel + '';
            return label += ' ' + str.replace(/\B(?=(\d{3})+(?!\d))/g, '\'');
          },
        },
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            padding: 5,
            callback: function(value, index, values) {
              let str = value + '';
              let len = str.length;
              return (str.indexOf('.') === -1 && len > 3) 
                      ? (len > 6) ? (value / 1000000) + ' M' : (value / 1000) + ' k' 
                      : value;
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
          ticks: {
            padding: 3 // padding btw. tick & label txt
          },
          gridLines: {
            drawOnChartArea: false,
            zeroLineWidth: 1,
            drawTicks: true,
            tickMarkLength: 5,
            drawBorder: true,
          }
        }],
        // responsive: false,
        maintainAspectRatio: false,
      }
    },
    plugins: [{
      afterDraw: (chart) => {
        if (typeof chart.config.options.avg != 'undefined') {
          const avg = chart.config.options.avg;
          const ctxPlugin = chart.chart.ctx;
          const xAxe = chart.scales[chart.config.options.scales.xAxes[0].id];
          const yAxe = chart.scales[chart.config.options.scales.yAxes[0].id];
          
          let prevPos = 0;
          let diff = 10;
          
          avg.forEach((elm, i) => {
            let pos = yAxe.getPixelForValue(elm);

            if (elm !== 0 && // we don't care for 0 values
              (i === 0 ||    // preventing avgs (hopefully) from overlapping
              (prevPos < (pos - diff) || prevPos > (pos + diff)))) {
              // line:
              ctxPlugin.strokeStyle = datasets[i].backgroundColor;
              ctxPlugin.setLineDash([5, 5]);
              ctxPlugin.beginPath();
              ctxPlugin.moveTo(xAxe.left, pos);
              ctxPlugin.lineTo(xAxe.right, pos);
              ctxPlugin.stroke();
          
              // label:
              ctxPlugin.fillStyle = datasets[i].backgroundColor;
              ctxPlugin.fillText('∅ ' + datasets[i].label + ': ' + separateByThousands(elm), xAxe.left, pos - 7);
            }
            prevPos = pos || 0;
          });
          ctxPlugin.setLineDash([0, 0]); // reset
        }
      }
    }] // end plugins
  };
  
  // if chart already available: just update content
  if (window.myChart) { 
    window.myChart.data.datasets = datasets;
    window.myChart.data.labels = input.labels;
    window.myChart.options.avg = [input.velo.avg, input.fuss.avg];
    window.myChart.update();
    // window.myChart.clear();
    // window.myChart.destroy();
    
    return true;
  }

  const ctx = document.getElementById('canvas').getContext('2d');
  Chart.defaults.global.defaultFontFamily = 'Helvetica';

  window.myChart = new Chart(ctx, config);
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
    elm.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\'') : '--';
};
