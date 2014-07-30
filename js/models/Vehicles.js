define(['jquery', 'leaflet', 'when', 'underscore', 'X2JS', 'utils', 'config'],
function($, L, when, _, X2JS, utils, config) {
    var x2js = new X2JS({});

    function Vehicles(route, direction) {
        this.route = route;
        this.direction = direction;

        this._vehicles = [];
        this._markers = {};
    }

    Vehicles.prototype = {
        fetch: function() {
            var deferred = when.defer();

            $.ajax({
                url: 'http://query.yahooapis.com/v1/public/yql',
                data:{
                    q: 'select * from xml where url="http://www.capmetro.org/planner/s_buslocation.asp?route=*"',
                    format: 'xml'
                }
            }).done(function(data) {
                var xml = x2js.xml2json(data),
                    Envelope =  xml.query.results.Envelope,
                    BuslocationResponse;

                if (!Envelope) {
                    console.log(xml);
                    deferred.reject('The CapMetro API is unavailable');
                    return;
                }

                BuslocationResponse = Envelope.Body.BuslocationResponse;

                if (!BuslocationResponse.Vehicles) {
                    deferred.reject(new Error('Zero active vehicles'));
                    return;
                }

                this._vehicles = BuslocationResponse.Vehicles.Vehicle;

                if (! Array.isArray(this._vehicles)) {  // not sure if this happens, but just in case
                    this._vehicles = [this._vehicles];
                }

                this._vehicles.forEach(function(vehicle) {
                    var Position = vehicle.Positions.Position,
                        posStr = Array.isArray(Position) ? Position[0] : Position;
                    vehicle.lat = posStr.split(',')[0];
                    vehicle.lng = posStr.split(',')[1];
                });

                deferred.resolve();
            }.bind(this)).fail(function(xhr, status, err) {
                deferred.reject(err);
            });

            return deferred.promise;
        },
        draw: function(layer) {
            var route = this.route,
                direction = this.direction,
                matchingVehicles = _.filter(this._vehicles, function(v) {
                    var _route = parseInt(v.Route),
                        // `Direction` in the xml is N or S, not 0 or 1. convert it to something sane
                        _dir = utils.getDirectionID(v.Route, v.Direction);

                    return route === _route && direction === _dir;
                }),
                vehicleIDs = matchingVehicles.map(function(v) { return v.Vehicleid; }),
                deletedVehicleIDs = _.filter(Object.keys(this._markers), function(vehicleID) {
                    return !_.find(vehicleIDs, function(vID) { return vID === vehicleID; });
                });

            console.log('Vehicles', matchingVehicles.length, 'Deleted', deletedVehicleIDs.length);

            deletedVehicleIDs.forEach(function(vID) {
                layer.removeLayer(this._markers[vID]);
                delete this._markers[vID];
            }.bind(this));

            matchingVehicles.forEach(function(vehicle) {
                var marker = this._markers[vehicle.Vehicleid],
                    popupContent = this.popupContent(vehicle),
                    fillColor = vehicle.Inservice === 'Y' ? 'rgb(34,189,252)' : 'rgb(188,188,188)';

                if (marker) {
                    var markerLatLng = marker.getLatLng(),
                        start = [markerLatLng.lat, markerLatLng.lng],
                        stop = [parseFloat(vehicle.lat), parseFloat(vehicle.lng)],
                        steps = 200,
                        delta = [stop[0] - start[0], stop[1] - start[1]];

                    marker._popup.setContent(popupContent);
                    marker.setStyle({fillColor: fillColor});

                    if (!_.isEqual(start, stop)) {

                        if (document.visibilityState === 'visible') {
                            this.animateMarker(marker, 0, steps, start, delta);
                        } else {
                            marker.setLatLng(stop);
                        }
                    }

                    return;
                }

                marker = L.circleMarker([vehicle.lat, vehicle.lng], {
                    color: '#fff',
                    weight: 3,
                    radius: 15,
                    opacity: 1,
                    fillOpacity: '0.9',
                    fillColor: fillColor,
                    zIndexOffset: config.vehicleZIndex
                });

                marker.bindPopup(popupContent);
                marker.addTo(layer);

                this._markers[vehicle.Vehicleid] = marker;
            }.bind(this));
        },
        popupContent: function(vehicle) {
            // FIXME: Bind this with ko like Stop
            var vehicleId = '<span class="id">Vehicle ' + vehicle.Vehicleid + '</span>',
                inner = [
                    'Updated at ' + vehicle.Updatetime,
                    'Moving ' + utils.formatDirection(vehicle.Route, vehicle.Direction) + ' at ' + vehicle.Speed + 'mph',
                    'Reliable? ' + vehicle.Reliable,
                    'Stopped? ' + vehicle.Stopped,
                    'Off Route? ' + vehicle.Offroute,
                    'In Service? ' + vehicle.Inservice,
                ].join('<br />');
            return '<div class="vehicle">' + vehicleId + inner + '</div>';
        },
        easeInOutCubic: function(t, b, c, d) {
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        },
        animateMarker: function(marker, i, steps, startLatLng, deltaLatLng) {
            var x = this.easeInOutCubic(i, startLatLng[0], deltaLatLng[0], steps),
                y = this.easeInOutCubic(i, startLatLng[1], deltaLatLng[1], steps);
            marker.setLatLng([x, y]);
            if (i < steps) {
                setTimeout(this.animateMarker.bind(this, marker, i+1, steps, startLatLng, deltaLatLng), 10);
            }
        }
    };
    return Vehicles;
});
