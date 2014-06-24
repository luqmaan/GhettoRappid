define(['knockout', 'when', 'models/TripCollection', 'text!templates/stop-popup.html'],
function(ko, when, TripCollection, stopPopupHTML) {
    function Stop(data) {
        this.name = ko.observable(data.stop_name);
        this.direction = ko.observable(parseInt(data.direction_id));
        this.route = ko.observable(parseInt(data.route_id));
        this.code = ko.observable(data.stop_code);
        this.desc = ko.observable(data.stop_desc);
        this.id = ko.observable(data.stop_id);
        this.lat = ko.observable(data.stop_lat);
        this.lon = ko.observable(data.stop_lon);
        this.name = ko.observable(data.stop_name);
        this.timezone = ko.observable(data.stop_timezone);
        this.url = ko.observable(data.url);

        this.trips = ko.observableArray();

        this.activityMsg = ko.observable();
        this.errorMsg = ko.observable();

        this.showTrips = ko.observable(false);
    }

    Stop.prototype = {
        loadTrips: function() {
            var deferred = when.defer();

            this.showTrips(true);
            this.errorMsg('');
            this.activityMsg('Loading...');

            TripCollection.fetch(this.route(), this.direction(), this.id()).then(
                function(trips) {
                    this.activityMsg('');
                    this.trips(trips);
                    deferred.resolve();
                }.bind(this),
                function(e) {
                    this.activityMsg('');
                    this.errorMsg(e);
                    console.error(e);
                    deferred.reject(e);
                }.bind(this)
            );

            return deferred.promise;
        },
        refresh: function() {
            if (this.showTrips()) {
                return this.loadTrips();
            }
        },
        showOnMap: function() {
            // perhaps publish a message that indicates this stop wants to be shown on the map?
        },
        dismissActivity: function() {
            this.activityMsg('');
        },
        dismissError: function() {
            this.errorMsg('');
        },
        popupContent: function() {
            var div = document.createElement('div');
            div.innerHTML = stopPopupHTML;
            ko.applyBindings(this, div);
            return div;
        }
    };

    return Stop;
});
