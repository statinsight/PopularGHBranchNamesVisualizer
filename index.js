var config = {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        title: {
            display: true,
            text: 'Most popular GH Repository Branches (with each repo > 1000 🌠)'
        },
        scales: {
            xAxes: [{
                display: true,
            }],
            yAxes: [{
                display: true,
                type: 'logarithmic',
                gridLines: {
                    borderDash: [2, 2]
                },
                ticks: {
                    callback: function (value, index, values) {
                        return Number(value.toString());
                    }
                }
            }]
        }
    }
};

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

window.onload = function() {
    init();
};

function init() {
    var priorDate = new Date();
    priorDate.setDate(new Date().getDate()-90);

    document.getElementById('start').value = priorDate.toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    document.getElementById('end').value = new Date().toLocaleString('en-us', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    document.getElementById('daysPerStep').value = 1;
}

function updateChart() {
    var updateBtn = document.getElementById('updatebtn');

    updateBtn.disabled = true;
    buildChart(new Date(document.getElementById('start').value), new Date(document.getElementById('end').value), Number.parseInt(document.getElementById('daysPerStep').value));
    updateBtn.disabled = false;
}

function setStatus(status) {
    document.getElementById('status').innerText = status;
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

    if(!daysPerStep || daysPerStep < 1) {
        daysPerStep = 1;
    }

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

    console.log(dates);

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

        setStatus("Processing date...");

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
        
        var colors = palette('tol', branchDataMap.size).map(hex => '#' + hex);
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

        config.options.scales.yAxes[0].ticks.min = minCount;
        config.data = {
            labels: dates,
            datasets: dataSets
        };

        window.lineChart = new Chart(ctx, config);

        setStatus("Done");
    }, function(err) {
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
