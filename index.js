let queryParams = {};
var config = {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
        },
        plugins: {
            title: {
                display: true,
                text: 'Most popular GH Repository Branches (with each repo > 1000 🌠)'
            }
        },
        legend: {
            labels: {}
        },
        scales: {
            x: {
                display: true,
                pointLabels: {},
                grid: {},
                ticks: {}
            },
            y: {
                display: true,
                type: 'logarithmic',
                grid: {
                    tickBorderDash: [2, 2]
                },
                ticks: {
                    callback: function (value, index, values) {
                        return Number(value.toString());
                    }
                }
            }
        }
    }
};

let chartElement;
let statusElement;
let colorScheme;

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

window.onload = function() {
    init();
};


(window.onpopstate = function () {
    let match,
        pl = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) {
            return decodeURIComponent(s.replace(pl, " "));
        },
        query = window.location.search.substring(1);

    while (match = search.exec(query)) {
        if (decode(match[1]) in queryParams) {
            if (!Array.isArray(queryParams[decode(match[1])])) {
                queryParams[decode(match[1])] = [queryParams[decode(match[1])]];
            }
            queryParams[decode(match[1])].push(decode(match[2]));
        } else {
            queryParams[decode(match[1])] = decode(match[2]);
        }
    }
})();

function init() {
    statusElement = document.getElementById('status');
    chartElement = document.getElementById('chart');

    var priorDate = new Date();
    priorDate.setDate(new Date().getDate()-365);

    if(queryParams.hasOwnProperty('hideconfig') || queryParams.hasOwnProperty('fullscreen')) {
        document.getElementById('config').hidden = true;
    }

    document.getElementById('start').value = queryParams['start'] ?? priorDate.toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    document.getElementById('end').value = queryParams['end'] ?? new Date().toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    document.getElementById('daysPerStep').value = queryParams['step'] ?? 7;

    colorScheme = queryParams['scheme'] ?? queryParams['colorscheme'] ?? 'tol-rainbow'
	
    if (queryParams['theme'] == 'light') {
        setTheme('light');
    }
    else if (queryParams['theme'] == 'dark' || window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }

	if(queryParams.hasOwnProperty('searchnow') || queryParams.hasOwnProperty('exec')) {
        updateChart();
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    Chart.defaults.borderColor = 'rgb(130,130,130)';
}

function updateChart() {
    let updateBtn = document.getElementById('updatebtn');

    updateBtn.disabled = true;

    let start = new Date(document.getElementById('start').value);
    let end = new Date(document.getElementById('end').value);
    let daysPerStep = Number.parseInt(document.getElementById('daysPerStep').value);

    // Check if inputs are valid and fix if necessary
    if(start > end) {
        start = end;
        document.getElementById('start').value = start.toISOString().slice(0, 10);
    }
    if(!daysPerStep || daysPerStep < 1) {
        daysPerStep = 1;
        document.getElementById('daysPerStep').value = daysPerStep;
    }

    buildChart(start, end, daysPerStep);

    updateBtn.disabled = false;
}

function showStatus() {
    statusElement.hidden = false;
    chartElement.hidden = true;
}

function hideStatus() {
    statusElement.hidden = true;
    chartElement.hidden = false;
}

function setStatus(status) {
    statusElement.innerText = status;
}

function setFetchStatus(successCounter, failedCounter, allCounter) {
    setStatus("Fetching data (" +
        (successCounter > 0 ? "✔️" + successCounter : "") +
        " " +
        (failedCounter > 0 ? "❌" + failedCounter : "") +
        " / " +
        allCounter +
        ")");
}

function buildChart(start, end, daysPerStep) {
    showStatus();
    setStatus("Updating...");

    var ctx = document.getElementById('canvas').getContext('2d');

    var dateData = [];
    var promises = [];

    // Fix DaylightSavingTime Problems
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    var dates = getDates(start, end, daysPerStep)
        .map(d => 
            d
                .toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'})
                .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2')
            );

    var dateFetchSuccessCounter = 0;
    var dateFetchFailedCounter = 0;
    setFetchStatus(dateFetchSuccessCounter, dateFetchFailedCounter, dates.length);

    dates.forEach(date => {
        var promise =
            d3.csv('https://raw.githubusercontent.com/statinsight/PopularGHBranchNames/master/data/' + date + '.csv')
                .then(d => {
                    dateFetchSuccessCounter++;
                    setFetchStatus(dateFetchSuccessCounter, dateFetchFailedCounter, dates.length);

                    dateData.push({
                        date: date,
                        data: d
                    })
                })
                .catch(err => {
                    dateFetchFailedCounter++;
                    setFetchStatus(dateFetchSuccessCounter, dateFetchFailedCounter, dates.length);

                    console.warn("Unable to fetch data of 'https://raw.githubusercontent.com/statinsight/PopularGHBranchNames/master/data/" + date + ".csv'", err);
                });
        promises.push(promise);
    });

    Promise.all(promises).then(function() {

        if(!dateData || dateData.length == 0) {
            showStatus();
            setStatus('No data to display. Is the configuration valid?');
            return;
        }

        setStatus("Processing dates...");

        dateData.sort(dynamicSort("date"));

        var dates = dateData.map(x => x.date);

        var minCount = Number.MAX_SAFE_INTEGER

        var branchDataMap = new Map();
        dateData.forEach(dd => {
            dd.data.forEach(bd => {
                var dateMap = branchDataMap.get(bd.DefaultBranch) ?? new Map();

                dateMap.set(dd.date, bd.count);

                minCount = Math.min(minCount, bd.count);

                branchDataMap.set(bd.DefaultBranch, dateMap)
            });
        });
        
        var colors = palette(colorScheme, branchDataMap.size).map(hex => '#' + hex);
        var dataSets = [];
        for (var [key, value] of branchDataMap.entries()) {

            var data = [];
            dates.forEach(date => {
                var parsed = parseInt(value.get(date));
                if(!parsed)
                    parsed = 0;
                data.push(parsed);
            });

            dataSets.push({
                label: key,
                backgroundColor: colors[dataSets.length],
                borderColor: colors[dataSets.length],
                fill: false,
                data: data
            });
        }

        setStatus("Building chart...");

        config.options.scales.y.suggestedMin = minCount;
        config.data = {
            labels: dates,
            datasets: dataSets
        };

        window?.lineChart?.destroy();
        window.lineChart = new Chart(ctx, config);

        hideStatus();
    }, function(err) {
        showStatus();
        setStatus('Error: ' + err);
        console.log("Error processing promises")
        console.error(err);
    });
}

function getDates(startDate, stopDate, daysPerStep) {
    var dateArray = new Array();
    var currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date (currentDate));
        currentDate = currentDate.addDays(daysPerStep);
    }

    if(dateArray.length > 0 && dateArray[dateArray.length-1].getTime() !== stopDate.getTime()) {
        dateArray.push(stopDate);
    }

    return dateArray;
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function getQueryParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
