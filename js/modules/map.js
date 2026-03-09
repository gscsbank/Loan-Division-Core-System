// js/modules/map.js

document.addEventListener('DOMContentLoaded', () => {

    // Map elements
    const mapContainerId = 'routine-map';
    let map = null;
    let markersLayer = null;

    // UI Elements
    const btnAddLocation = document.getElementById('btn-add-location');
    const panelAddLocation = document.getElementById('panel-add-location');
    const formAddLocation = document.getElementById('form-add-location');
    const locationCloseBtns = document.querySelectorAll('.location-close-btn');

    const inputLat = document.getElementById('loc-lat');
    const inputLng = document.getElementById('loc-lng');
    const inputAcc = document.getElementById('loc-account');
    const inputName = document.getElementById('loc-name');
    const inputFreq = document.getElementById('loc-freq');
    const inputOfficer = document.getElementById('loc-officer');

    const instructionBanner = document.getElementById('map-instruction');

    // Filter element
    const filterOfficer = document.getElementById('map-filter-officer');

    // State
    let isAddingMode = false;
    let tempMarker = null;

    // Listeners
    if (btnAddLocation) btnAddLocation.addEventListener('click', toggleAddMode);

    locationCloseBtns.forEach(btn => btn.addEventListener('click', cancelAddMode));

    if (formAddLocation) formAddLocation.addEventListener('submit', handleSaveLocation);

    if (filterOfficer) filterOfficer.addEventListener('change', loadMarkers);

    // Initializer attached to module switch
    document.addEventListener('moduleSwitched', (e) => {
        if (e.detail.target === 'map') {
            // Leaflet needs explicit invalidateSize when container changes from display:none to block
            setTimeout(() => {
                initMap();
                loadMarkers();
            }, 100);
        }
    });

    // Functions
    function initMap() {
        if (map !== null) {
            map.invalidateSize();
            return;
        }

        // Setup Nikaweratiya boundaries
        const nikaweratiyaBounds = L.latLngBounds(
            [7.65, 80.05], // South West
            [7.85, 80.25]  // North East
        );

        // Center on Nikaweratiya
        map = L.map(mapContainerId, {
            maxBounds: nikaweratiyaBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 11
        }).setView([7.75, 80.15], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);

        // Click on map to add pin (when in adding mode)
        map.on('click', function (e) {
            if (!isAddingMode) return;

            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            inputLat.value = lat.toFixed(6);
            inputLng.value = lng.toFixed(6);

            if (tempMarker) {
                map.removeLayer(tempMarker);
            }

            // Phosphor Pin icon
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='bg-orange-500 rounded-full w-4 h-4 border-2 border-white shadow-lg animate__animated animate__bounceIn'></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            tempMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

            // Show the form side panel
            panelAddLocation.classList.remove('translate-x-full');
            panelAddLocation.classList.add('translate-x-0');
            instructionBanner.classList.add('hidden');
        });
    }

    function toggleAddMode() {
        isAddingMode = true;
        btnAddLocation.classList.add('hidden');
        instructionBanner.classList.remove('hidden');
        map._container.style.cursor = 'crosshair';
    }

    function cancelAddMode() {
        isAddingMode = false;
        btnAddLocation.classList.remove('hidden');
        instructionBanner.classList.add('hidden');
        panelAddLocation.classList.remove('translate-x-0');
        panelAddLocation.classList.add('translate-x-full');
        map._container.style.cursor = '';

        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
        formAddLocation.reset();
        document.getElementById('loc-id').value = '';
    }

    async function handleSaveLocation(e) {
        e.preventDefault();

        const lat = parseFloat(inputLat.value);
        const lng = parseFloat(inputLng.value);

        if (!lat || !lng) {
            window.showAlert('Selection Missing', 'Please click on the map to select a location first.', 'warning');
            return;
        }

        try {
            const locId = document.getElementById('loc-id').value;
            const data = {
                accountNo: inputAcc.value.trim(),
                name: inputName.value.trim(),
                visitFrequency: inputFreq.value,
                officerName: inputOfficer.value.trim(),
                lat: lat,
                lng: lng
            };

            if (locId) {
                await db.customers.update(parseInt(locId), data);
                window.showToast('Location updated');
            } else {
                await db.customers.add(data);
                window.showToast('Location saved');
            }

            cancelAddMode();
            loadMarkers();
        } catch (error) {
            console.error("Failed to save location", error);
            window.showAlert('Error', 'Error saving the customer location.', 'error');
        }
    }

    async function loadMarkers() {
        if (!map || !markersLayer) return;

        markersLayer.clearLayers();

        try {
            const customers = await db.customers.toArray();
            let bounds = L.latLngBounds();

            // Generate a color off of officer name
            function getOfficerColor(name) {
                const colors = ['#dc2626', '#16a34a', '#2563eb', '#ca8a04', '#9333ea', '#c026d3', '#0891b2', '#ea580c'];
                let hash = 0;
                for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                return colors[Math.abs(hash) % colors.length];
            }

            // Populate filter if necessary
            if (filterOfficer && filterOfficer.options.length <= 1) {
                const officers = [...new Set(customers.map(c => c.officerName))].sort();
                officers.forEach(o => {
                    const opt = document.createElement('option');
                    opt.value = opt.innerText = o;
                    filterOfficer.appendChild(opt);
                });
            }

            const selectedOfficer = filterOfficer ? filterOfficer.value : 'All';

            customers.forEach(cust => {
                if (selectedOfficer !== 'All' && cust.officerName !== selectedOfficer) return;

                const markerColor = getOfficerColor(cust.officerName);
                const markerIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class='text-white rounded-full w-7 h-7 flex items-center justify-center border-2 border-white shadow shadow-blue-900/50 text-xs font-bold relative group' style='background-color: ${markerColor}'>
                            <i class="ph-fill ph-storefront"></i>
                            <div class="print-label hidden absolute top-full mt-1 px-1 bg-white text-black text-[10px] font-mono border border-slate-300 font-bold whitespace-nowrap z-50">${cust.accountNo}</div>
                           </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                });

                const marker = L.marker([cust.lat, cust.lng], { icon: markerIcon });

                const popupContent = `
                    <div class="p-1 min-w-[200px]">
                        <h4 class="font-bold text-slate-800 text-sm mb-1">${cust.name}</h4>
                        <div class="text-xs text-slate-600 mb-2 border-b border-slate-100 pb-2">
                            A/C: <span class="font-mono text-slate-800">${cust.accountNo}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-500">Route Officer:</span>
                            <span class="font-medium text-slate-800">${cust.officerName}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs mt-1 mb-3">
                            <span class="text-slate-500">Frequency:</span>
                            <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">${cust.visitFrequency}</span>
                        </div>
                        <div class="flex justify-end gap-2 border-t border-slate-100 pt-2 pb-1 print-hide">
                            <button onclick="window.editMapLocation(${cust.id})" class="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors">Edit</button>
                            <button onclick="window.deleteMapLocation(${cust.id})" class="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">Delete</button>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                markersLayer.addLayer(marker);
                bounds.extend([cust.lat, cust.lng]);
            });

            // Auto-fit map to show all markers if there are any
            if (customers.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }

        } catch (error) {
            console.error("Failed to load map markers", error);
        }
    }

    // Print Map Feature
    const btnPrintMap = document.getElementById('btn-print-map');
    if (btnPrintMap) {
        btnPrintMap.addEventListener('click', () => {
            document.body.classList.add('is-printing-map');

            // Add print styles for the map if not already added
            if (!document.getElementById('map-print-styles')) {
                const style = document.createElement('style');
                style.id = 'map-print-styles';
                style.textContent = `
                    @media print {
                        @page { size: landscape; margin: 10mm; }
                        body.is-printing-map .module-view:not(#view-map) { display: none !important; }
                        body.is-printing-map #navbar, body.is-printing-map #sidebar { display: none !important; }
                        body.is-printing-map main { padding: 0 !important; margin: 0 !important; width: 100vw !important; height: 100vh !important; }
                        body.is-printing-map #view-map { position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; display: block !important; padding: 0; }
                        body.is-printing-map #routine-map { height: 100vh !important; width: 100vw !important; }
                        body.is-printing-map .print-label { display: block !important; }
                        body.is-printing-map .print-hide { display: none !important; }
                        body.is-printing-map .leaflet-control-container { display: none !important; }
                    }
                `;
                document.head.appendChild(style);
            }

            if (map) {
                map.invalidateSize();
            }

            // Wait a moment for layout to adjust and tiles/labels to show
            setTimeout(() => {
                window.print();
                document.body.classList.remove('is-printing-map');
                if (map) map.invalidateSize();
            }, 600);
        });
    }

    // Global exposed functions for Map Edit/Delete
    window.editMapLocation = async (id) => {
        try {
            const loc = await db.customers.get(id);
            if (loc) {
                document.getElementById('loc-id').value = loc.id;
                inputLat.value = loc.lat;
                inputLng.value = loc.lng;
                inputAcc.value = loc.accountNo;
                inputName.value = loc.name;
                inputFreq.value = loc.visitFrequency;
                inputOfficer.value = loc.officerName;

                // Show panel
                panelAddLocation.classList.remove('translate-x-full');
                panelAddLocation.classList.add('translate-x-0');
                map.closePopup();
            }
        } catch (e) { console.error(e); }
    };

    window.deleteMapLocation = async (id) => {
        try {
            const confirmed = await window.showConfirm('Delete Location', 'Are you sure you want to remove this plotted customer?', 'Yes, delete');
            if (confirmed) {
                await db.customers.delete(id);
                window.showToast('Location deleted');
                map.closePopup();
                loadMarkers();
            }
        } catch (e) { console.error(e); }
    };
});
