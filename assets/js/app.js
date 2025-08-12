/**
 * RunMyWay - Modern Route Generator Application
 * Mobile-first, responsive route planning app
 */

class RunMyWayApp {
    constructor() {
        // Map and route state
        this.map = null;
        this.markers = [];
        this.routePolyline = null;
        this.currentRoute = null;
        
        // POI and route management
        this.pois = [];
        this.selectedPOIDetails = [];
        this.skippedCategoriesDetails = [];
        this.startPoint = null;
        this.endPoint = null;
        this.returnToStart = true;
        
        // API and caching
        this.apiCache = new Map();
        this.lastApiCall = 0;
        this.apiDelay = 200;
        
        // Variant system
        this.routeHistory = new Set();
        this.currentSeed = 0;
        this.currentVariantInfo = null;
        
        // UI state management
        this.isMobile = window.innerWidth < 769;
        this.sidebarOpen = false;
        this.bottomSheetOpen = false;
        
        // Mobile floating controls state
        this.fabMenuOpen = false;
        this.miniSettingsOpen = false;
        this.currentStatus = 'start'; // start, poi, ready, generating, done
        
        // POI Categories configuration
        this.poiCategories = [
            { id: 'parc', name: 'Parcs et jardins', icon: '🌳', queries: ['parc', 'jardin public', 'espace vert'] },
            { id: 'foret', name: 'Forêts', icon: '🌲', queries: ['forêt', 'bois'] },
            { id: 'monument', name: 'Monuments', icon: '🏛️', queries: ['monument', 'château', 'église', 'cathédrale'] },
            { id: 'musee', name: 'Musées', icon: '🏛️', queries: ['musée', 'galerie'] },
            { id: 'sport', name: 'Installations sportives', icon: '⚽', queries: ['stade', 'gymnase', 'piscine', 'terrain de sport'] },
            { id: 'culture', name: 'Lieux culturels', icon: '🎭', queries: ['théâtre', 'cinéma', 'opéra', 'centre culturel'] },
            { id: 'eau', name: 'Points d\'eau', icon: '💧', queries: ['lac', 'rivière', 'canal', 'fontaine'] },
            { id: 'marche', name: 'Marchés', icon: '🛒', queries: ['marché', 'marché couvert'] },
            { id: 'panorama', name: 'Points de vue', icon: '🏔️', queries: ['belvédère', 'point de vue', 'colline'] }
        ];
        
        // Bind methods to preserve 'this' context
        this.handleResize = this.handleResize.bind(this);
        this.handleMapClick = this.handleMapClick.bind(this);
        this.generateRoute = this.generateRoute.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize UI components
            this.initializeUI();
            this.initializeMap();
            this.setupEventListeners();
            this.setupAutocomplete();
            this.generatePOICheckboxes();
            this.initializeAccordions();
            
            // Handle initial screen size
            this.handleResize();
            
            console.log('🚀 RunMyWay app initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError('Erreur lors de l\'initialisation de l\'application');
        }
    }

    /**
     * Initialize UI components and mobile responsiveness
     */
    initializeUI() {
        // Set up responsive behavior
        window.addEventListener('resize', this.handleResize);
        
        // Initialize mobile menu state
        this.updateUIForScreenSize();
    }

    /**
     * Handle window resize events for responsiveness
     */
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 769;
        
        if (wasMobile !== this.isMobile) {
            this.updateUIForScreenSize();
        }
        
        // Invalidate map size after resize
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 300);
        }
    }

    /**
     * Update UI components based on screen size
     */
    updateUIForScreenSize() {
        const sidebar = document.getElementById('sidebar');
        
        if (this.isMobile) {
            // Mobile: sidebar is hidden by default
            sidebar.classList.remove('open');
            this.sidebarOpen = false;
        } else {
            // Desktop: sidebar is always visible
            sidebar.classList.add('open');
            this.sidebarOpen = true;
        }
    }

    /**
     * Initialize the Leaflet map
     */
    initializeMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Map container not found');
            }

            // Clear any existing map instance
            if (this.map) {
                this.map.remove();
            }

            // Create map with responsive options
            this.map = L.map('map', {
                preferCanvas: true,
                zoomControl: false, // We'll add custom controls
                attributionControl: false // We'll add custom attribution
            }).setView([48.8566, 2.3522], 12);
            
            // Add tile layer with high-DPI support
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                detectRetina: true
            }).addTo(this.map);

            // Add custom zoom control in bottom right
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);

            // Add custom attribution
            L.control.attribution({
                position: 'bottomleft',
                prefix: false
            }).addTo(this.map);

            // Map event handlers
            this.map.on('click', this.handleMapClick);
            this.map.on('contextmenu', (e) => this.removeNearestMarker(e.latlng));
            
            // Mobile-specific map settings
            if (this.isMobile) {
                this.map.scrollWheelZoom.disable();
                this.map.on('focus', () => this.map.scrollWheelZoom.enable());
                this.map.on('blur', () => this.map.scrollWheelZoom.disable());
            }

        } catch (error) {
            console.error('Error initializing map:', error);
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                                background: var(--bg-tertiary); color: var(--error-color); padding: 2rem; text-align: center;">
                        <div>
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <h3>Erreur de chargement de la carte</h3>
                            <p>Veuillez recharger la page</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Mobile menu controls
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebarClose = document.getElementById('sidebarClose');
        const overlay = document.getElementById('overlay');

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => this.closeMobileMenu());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeMobileMenu());
        }

        // Main action buttons
        const generateBtn = document.getElementById('generateBtn');
        const resetBtn = document.getElementById('resetBtn');
        const exportBtn = document.getElementById('exportBtn');
        const useLocationBtn = document.getElementById('useLocationBtn');

        if (generateBtn) {
            generateBtn.addEventListener('click', this.generateRoute);
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportGPX());
        }

        if (useLocationBtn) {
            useLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        }

        // POI management
        const addPOIBtn = document.getElementById('addPOIBtn');
        if (addPOIBtn) {
            addPOIBtn.addEventListener('click', () => this.addPOI());
        }
        
        // End point management
        const returnToStartCheckbox = document.getElementById('returnToStart');
        if (returnToStartCheckbox) {
            returnToStartCheckbox.addEventListener('change', (e) => {
                this.returnToStart = e.target.checked;
                if (this.returnToStart && this.endPoint) {
                    this.clearEndPoint();
                }
            });
        }

        // Map controls
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const centerMapBtn = document.getElementById('centerMapBtn');

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        if (centerMapBtn) {
            centerMapBtn.addEventListener('click', () => this.centerMap());
        }

        // Bottom sheet controls (mobile)
        const closeBottomSheet = document.getElementById('closeBottomSheet');
        if (closeBottomSheet) {
            closeBottomSheet.addEventListener('click', () => this.closeBottomSheet());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
                this.closeBottomSheet();
            }
        });

        // Touch handling for mobile
        if (this.isMobile) {
            this.setupTouchHandlers();
            this.setupMobileFloatingControls();
        }
    }

    /**
     * Initialize accordion sections
     */
    initializeAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                this.toggleAccordion(header);
            });
        });
    }

    /**
     * Toggle accordion section open/closed
     */
    toggleAccordion(header) {
        const target = header.getAttribute('data-target');
        const content = document.getElementById(target);
        
        if (!content) return;
        
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Open accordion
            content.classList.remove('collapsed');
            header.classList.add('active');
        } else {
            // Close accordion
            content.classList.add('collapsed');
            header.classList.remove('active');
        }
    }

    /**
     * Clear end point marker
     */
    clearEndPoint() {
        if (this.endPoint) {
            this.map.removeLayer(this.endPoint.marker);
            this.endPoint = null;
            
            // Clear end address input
            const endAddressInput = document.getElementById('endAddress');
            if (endAddressInput) {
                endAddressInput.value = '';
            }
        }
    }

    /**
     * Setup mobile floating controls
     */
    setupMobileFloatingControls() {
        // FAB (Floating Action Button) controls
        const mainFAB = document.getElementById('mainFAB');
        const fabMenu = document.getElementById('fabMenu');
        const fabGenerate = document.getElementById('fabGenerate');
        const fabPOI = document.getElementById('fabPOI');
        const fabSettings = document.getElementById('fabSettings');

        if (mainFAB) {
            mainFAB.addEventListener('click', () => this.toggleFABMenu());
        }

        if (fabGenerate) {
            fabGenerate.addEventListener('click', () => {
                this.closeFABMenu();
                this.generateRoute();
            });
        }

        if (fabPOI) {
            fabPOI.addEventListener('click', () => {
                this.closeFABMenu();
                this.toggleMobileMenu();
            });
        }

        if (fabSettings) {
            fabSettings.addEventListener('click', () => {
                this.closeFABMenu();
                this.openMiniSettings();
            });
        }

        // Quick action buttons
        const quickResetBtn = document.getElementById('quickResetBtn');
        const quickLocationBtn = document.getElementById('quickLocationBtn');
        const quickSettingsBtn = document.getElementById('quickSettingsBtn');

        if (quickResetBtn) {
            quickResetBtn.addEventListener('click', () => this.reset());
        }

        if (quickLocationBtn) {
            quickLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        }

        if (quickSettingsBtn) {
            quickSettingsBtn.addEventListener('click', () => this.toggleMiniSettings());
        }

        // Mini settings panel
        const miniSettingsClose = document.getElementById('miniSettingsClose');
        const quickDistanceSlider = document.getElementById('quickDistanceSlider');
        const quickDistanceValue = document.getElementById('quickDistanceValue');
        const modeButtons = document.querySelectorAll('.mode-btn');
        const quickPOIButtons = document.querySelectorAll('.quick-poi-btn');

        if (miniSettingsClose) {
            miniSettingsClose.addEventListener('click', () => this.closeMiniSettings());
        }

        if (quickDistanceSlider && quickDistanceValue) {
            quickDistanceSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                quickDistanceValue.textContent = `${value} km`;
                document.getElementById('targetDistance').value = value;
            });
        }

        // Mode toggle buttons
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('travelMode').value = btn.dataset.mode;
            });
        });

        // Quick POI buttons
        quickPOIButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const categoryId = btn.dataset.category;
                const checkbox = document.getElementById(`poi-${categoryId}`);
                
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    btn.classList.toggle('active', checkbox.checked);
                    
                    // Update main sidebar checkbox too
                    const poiItem = checkbox.closest('.poi-item');
                    if (poiItem) {
                        poiItem.classList.toggle('selected', checkbox.checked);
                    }
                }
            });
        });

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-container') && this.fabMenuOpen) {
                this.closeFABMenu();
            }
            if (!e.target.closest('.mini-settings-panel') && 
                !e.target.closest('#quickSettingsBtn') && this.miniSettingsOpen) {
                this.closeMiniSettings();
            }
        });

        // Initialize status
        this.updateStatus('start');
    }

    /**
     * Toggle FAB menu
     */
    toggleFABMenu() {
        this.fabMenuOpen = !this.fabMenuOpen;
        const fab = document.getElementById('mainFAB');
        const fabMenu = document.getElementById('fabMenu');
        
        if (this.fabMenuOpen) {
            fab.classList.add('expanded');
            fabMenu.classList.add('open', 'animate-in');
        } else {
            fab.classList.remove('expanded');
            fabMenu.classList.remove('open');
        }
    }

    /**
     * Close FAB menu
     */
    closeFABMenu() {
        this.fabMenuOpen = false;
        const fab = document.getElementById('mainFAB');
        const fabMenu = document.getElementById('fabMenu');
        
        fab.classList.remove('expanded');
        fabMenu.classList.remove('open');
    }

    /**
     * Open mini settings panel
     */
    openMiniSettings() {
        this.miniSettingsOpen = true;
        const panel = document.getElementById('miniSettingsPanel');
        panel.classList.add('open', 'animate-in');
    }

    /**
     * Toggle mini settings panel
     */
    toggleMiniSettings() {
        if (this.miniSettingsOpen) {
            this.closeMiniSettings();
        } else {
            this.openMiniSettings();
        }
    }

    /**
     * Close mini settings panel
     */
    closeMiniSettings() {
        this.miniSettingsOpen = false;
        const panel = document.getElementById('miniSettingsPanel');
        panel.classList.remove('open');
    }

    /**
     * Update status indicator
     */
    updateStatus(status, progress = 0) {
        this.currentStatus = status;
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = statusIndicator?.querySelector('.status-text');
        const statusProgress = statusIndicator?.querySelector('.status-progress');

        if (!statusText || !statusProgress) return;

        const messages = {
            start: 'Cliquez pour ajouter un point de départ',
            location: 'Point de départ ajouté ! Sélectionnez des POI',
            poi: 'POI sélectionnés. Prêt à générer le parcours',
            ready: 'Tout est prêt ! Appuyez sur Générer',
            generating: 'Génération du parcours en cours...',
            done: 'Parcours généré avec succès !'
        };

        statusText.textContent = messages[status] || messages.start;

        // Update progress bar
        statusProgress.className = 'status-progress';
        if (progress > 0) {
            if (progress <= 25) statusProgress.classList.add('progress-25');
            else if (progress <= 50) statusProgress.classList.add('progress-50');
            else if (progress <= 75) statusProgress.classList.add('progress-75');
            else statusProgress.classList.add('progress-100');
        }

        // Update FAB state
        const fab = document.getElementById('mainFAB');
        const fabIcon = fab?.querySelector('.fab-icon');
        const fabText = fab?.querySelector('.fab-text');

        if (fab && fabIcon && fabText) {
            fab.classList.remove('loading');
            
            switch (status) {
                case 'generating':
                    fab.classList.add('loading');
                    fabIcon.className = 'fab-icon fas fa-spinner fa-spin';
                    fabText.textContent = 'Génération';
                    break;
                case 'done':
                    fabIcon.className = 'fab-icon fas fa-check';
                    fabText.textContent = 'Terminé';
                    break;
                case 'ready':
                    fabIcon.className = 'fab-icon fas fa-route';
                    fabText.textContent = 'Générer';
                    break;
                default:
                    fabIcon.className = 'fab-icon fas fa-route';
                    fabText.textContent = 'Générer';
            }
        }
    }

    /**
     * Setup touch handlers for mobile devices
     */
    setupTouchHandlers() {
        const bottomSheet = document.getElementById('mobileResults');
        if (!bottomSheet) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const handle = bottomSheet.querySelector('.bottom-sheet-handle');
        
        const handleTouchStart = (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            bottomSheet.style.transition = 'none';
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0) { // Only allow dragging down
                bottomSheet.style.transform = `translateY(${diff}px)`;
            }
        };

        const handleTouchEnd = () => {
            if (!isDragging) return;
            
            isDragging = false;
            bottomSheet.style.transition = 'transform 0.3s ease';
            
            const diff = currentY - startY;
            if (diff > 100) { // Threshold for closing
                this.closeBottomSheet();
            } else {
                bottomSheet.style.transform = 'translateY(0)';
            }
        };

        handle.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    }

    /**
     * Toggle mobile menu visibility
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        if (!this.isMobile || !this.sidebarOpen) return;
        
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.sidebarOpen = false;
    }

    /**
     * Open bottom sheet (mobile results)
     */
    openBottomSheet() {
        if (!this.isMobile) return;
        
        const bottomSheet = document.getElementById('mobileResults');
        const mobileContent = document.getElementById('mobileResultsContent');
        const desktopResults = document.getElementById('resultsSection');
        
        // Copy results content to mobile bottom sheet
        if (desktopResults && mobileContent) {
            mobileContent.innerHTML = desktopResults.innerHTML;
        }
        
        bottomSheet.classList.add('open');
        this.bottomSheetOpen = true;
    }

    /**
     * Close bottom sheet
     */
    closeBottomSheet() {
        const bottomSheet = document.getElementById('mobileResults');
        bottomSheet.classList.remove('open');
        this.bottomSheetOpen = false;
    }

    /**
     * Setup autocomplete for address and POI inputs
     */
    setupAutocomplete() {
        this.setupStartAddressAutocomplete();
        this.setupEndAddressAutocomplete();
        this.setupPOIAutocomplete();
    }

    /**
     * Setup start address autocomplete
     */
    setupStartAddressAutocomplete() {
        const input = document.getElementById('startAddress');
        const suggestionsDiv = document.getElementById('startAddressSuggestions');
        
        if (!input || !suggestionsDiv) return;

        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.showStartAddressSuggestions(e.target.value, suggestionsDiv);
            }, 300);
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
            }, 200);
        });
    }

    /**
     * Setup end address autocomplete
     */
    setupEndAddressAutocomplete() {
        const input = document.getElementById('endAddress');
        const suggestionsDiv = document.getElementById('endAddressSuggestions');
        
        if (!input || !suggestionsDiv) return;
        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.showEndAddressSuggestions(e.target.value, suggestionsDiv);
            }, 300);
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
            }, 200);
        });
    }

    /**
     * Setup POI input autocomplete
     */
    setupPOIAutocomplete() {
        const input = document.getElementById('poiInput');
        const suggestionsDiv = document.getElementById('poiSuggestions');
        
        if (!input || !suggestionsDiv) return;

        let debounceTimer;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.showPOISuggestions(e.target.value, suggestionsDiv);
            }, 300);
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionsDiv.style.display = 'none';
            }, 200);
        });

        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addPOI();
            }
        });
    }

    /**
     * Generate POI category checkboxes with modern styling
     */
    generatePOICheckboxes() {
        const container = document.getElementById('poiCheckboxes');
        if (!container) return;
        
        container.innerHTML = '';

        this.poiCategories.forEach(category => {
            const poiItem = document.createElement('div');
            poiItem.className = 'poi-item';
            
            poiItem.innerHTML = `
                <input type="checkbox" id="poi-${category.id}" value="${category.id}">
                <label for="poi-${category.id}">
                    <span>${category.icon}</span>
                    <span>${category.name}</span>
                </label>
            `;
            
            // Handle clicks on the entire item
            poiItem.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = poiItem.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                
                poiItem.classList.toggle('selected', poiItem.querySelector('input').checked);
            });
            
            container.appendChild(poiItem);
        });
    }

    // [Continue with the rest of the methods from the original app...]
    // I'll implement the core functionality methods next

    /**
     * Create custom markers for different types
     */
    createCustomMarker(latlng, type, options = {}) {
        const markerOptions = { draggable: true };
        
        // Define marker styles based on type
        const markerStyles = {
            start: {
                color: '#4CAF50',
                icon: '🏁',
                size: 'large',
                title: 'Point de départ'
            },
            end: {
                color: '#DC2626',
                icon: '🏁',
                size: 'large',
                title: 'Point d\'arrivée'
            },
            waypoint: {
                color: '#2196F3', 
                icon: '📍',
                size: 'medium',
                title: 'Point d\'intérêt'
            },
            poi: {
                color: '#FF9800',
                icon: options.poiIcon || '⭐',
                size: 'medium',
                title: options.poiName || 'POI'
            },
            finish: {
                color: '#f44336',
                icon: '🏆',
                size: 'large', 
                title: 'Arrivée'
            }
        };
        
        const style = markerStyles[type] || markerStyles.waypoint;
        
        // Create custom HTML icon
        const customIcon = L.divIcon({
            className: `custom-marker marker-${type}`,
            html: `
                <div class="marker-container" style="
                    background: ${style.color};
                    width: ${style.size === 'large' ? '36px' : '30px'};
                    height: ${style.size === 'large' ? '36px' : '30px'};
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${style.size === 'large' ? '16px' : '14px'};
                    position: relative;
                ">
                    <span style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">${style.icon}</span>
                </div>
                <div class="marker-label" style="
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    white-space: nowrap;
                    margin-top: 2px;
                    display: none;
                ">${style.title}</div>
            `,
            iconSize: [style.size === 'large' ? 36 : 30, style.size === 'large' ? 36 : 30],
            iconAnchor: [style.size === 'large' ? 18 : 15, style.size === 'large' ? 18 : 15],
            popupAnchor: [0, -(style.size === 'large' ? 18 : 15)]
        });
        
        markerOptions.icon = customIcon;
        
        const marker = L.marker(latlng, markerOptions);
        
        // Add hover effect to show label
        marker.on('mouseover', function() {
            const label = this.getElement()?.querySelector('.marker-label');
            if (label) label.style.display = 'block';
        });
        
        marker.on('mouseout', function() {
            const label = this.getElement()?.querySelector('.marker-label');
            if (label) label.style.display = 'none';
        });
        
        return marker;
    }

    /**
     * Handle map clicks for adding start point or waypoints
     */
    async handleMapClick(latlng) {
        const startAddressInput = document.getElementById('startAddress');
        const endAddressInput = document.getElementById('endAddress');
        
        if (!startAddressInput.value.trim()) {
            // Set as start point
            try {
                const address = await this.reverseGeocode(latlng.latlng);
                startAddressInput.value = address;
                
                const marker = this.createCustomMarker(latlng.latlng, 'start').addTo(this.map);
                marker.bindPopup('🏁 Point de départ');
                
                marker.on('dragend', async () => {
                    const newAddress = await this.reverseGeocode(marker.getLatLng());
                    startAddressInput.value = newAddress;
                    this.clearRoute();
                });
                
                this.markers.push(marker);
                this.startPoint = { latlng: latlng.latlng, marker };
                
                // Close mobile menu after selecting start point
                if (this.isMobile) {
                    this.closeMobileMenu();
                    this.updateStatus('location', 25);
                }
                
            } catch (error) {
                console.error('Error setting start address:', error);
                startAddressInput.value = 'Position sélectionnée sur la carte';
            }
        } else if (!this.returnToStart && endAddressInput && !endAddressInput.value.trim()) {
            // Set as end point if return to start is disabled
            try {
                const address = await this.reverseGeocode(latlng.latlng);
                endAddressInput.value = address;
                
                const marker = this.createCustomMarker(latlng.latlng, 'end').addTo(this.map);
                marker.bindPopup('🏁 Point d\'arrivée');
                
                marker.on('dragend', async () => {
                    const newAddress = await this.reverseGeocode(marker.getLatLng());
                    endAddressInput.value = newAddress;
                    this.clearRoute();
                });
                
                this.markers.push(marker);
                this.endPoint = { latlng: latlng.latlng, marker };
                
            } catch (error) {
                console.error('Error setting end address:', error);
                endAddressInput.value = 'Position sélectionnée sur la carte';
            }
        } else {
            // Add as waypoint
            const marker = this.createCustomMarker(latlng.latlng, 'waypoint').addTo(this.map);
            marker.bindPopup(`📍 Point d'intérêt ${this.markers.length}`);
            
            marker.on('dragend', () => this.clearRoute());
            this.markers.push(marker);
            this.clearRoute();
        }
    }

    /**
     * Remove nearest marker on right-click
     */
    removeNearestMarker(latlng) {
        if (this.markers.length === 0) return;

        let nearestMarker = null;
        let minDistance = Infinity;

        this.markers.forEach(marker => {
            const distance = latlng.distanceTo(marker.getLatLng());
            if (distance < minDistance) {
                minDistance = distance;
                nearestMarker = marker;
            }
        });

        if (nearestMarker && minDistance < 100) {
            this.map.removeLayer(nearestMarker);
            this.markers = this.markers.filter(m => m !== nearestMarker);
            this.clearRoute();
        }
    }

    /**
     * Use current geolocation as start point
     */
    async useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Géolocalisation non supportée par votre navigateur');
            return;
        }

        const button = document.getElementById('useLocationBtn');
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Localisation...';
            button.disabled = true;
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            this.map.setView(latlng, 15);
            
            await this.handleMapClick({ latlng });
            
        } catch (error) {
            console.error('Geolocation error:', error);
            this.showError('Impossible d\'obtenir votre position');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorAlert && errorMessage) {
            errorMessage.textContent = message;
            errorAlert.style.display = 'flex';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorAlert = document.getElementById('errorAlert');
        if (errorAlert) {
            errorAlert.style.display = 'none';
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    /**
     * Show results section
     */
    showResults(route) {
        if (!route) return;
        
        const distance = (route.distance / 1000).toFixed(2);
        const duration = Math.round(route.duration / 60);

        const distanceResult = document.getElementById('distanceResult');
        const durationResult = document.getElementById('durationResult');
        
        if (distanceResult) distanceResult.textContent = `${distance} km`;
        if (durationResult) durationResult.textContent = `${duration} min`;
        
        // Show route explanation
        this.showRouteExplanation(route);
        
        if (this.isMobile) {
            this.openBottomSheet();
        } else {
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection) {
                resultsSection.style.display = 'block';
            }
        }
    }

    /**
     * Hide results section
     */
    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        if (this.isMobile) {
            this.closeBottomSheet();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.log('Error attempting to exit fullscreen:', err);
            });
        }
    }

    /**
     * Center map on current route or markers
     */
    centerMap() {
        if (this.routePolyline) {
            this.map.fitBounds(this.routePolyline.getBounds(), { padding: [20, 20] });
        } else if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
        }
    }

    /**
     * Main route generation function
     */
    async generateRoute() {
        try {
            this.hideError();
            this.hideResults();
            this.showLoading();
            
            if (this.isMobile) {
                this.updateStatus('generating', 50);
            }

            let waypoints = [];

            // Get start address
            const startAddress = document.getElementById('startAddress').value.trim();
            let startPoint;
            
            if (startAddress) {
                startPoint = await this.geocode(startAddress);
            } else if (this.markers.length > 0) {
                startPoint = this.markers[0].getLatLng();
            } else {
                throw new Error('Veuillez définir un point de départ');
            }
            
            waypoints.push(startPoint);
            
            // Add waypoints from map markers
            const additionalMarkers = this.markers.slice(startAddress ? 0 : 1);
            additionalMarkers.forEach(marker => {
                waypoints.push(marker.getLatLng());
            });

            const targetDistance = parseFloat(document.getElementById('targetDistance').value);
            const selectedPOIs = [];
            
            // Use advanced variant generation system
            const checkedCategories = document.querySelectorAll('#poiCheckboxes input[type="checkbox"]:checked');
            
            if (checkedCategories.length > 0) {
                const bestVariant = await this.generateRouteVariants(checkedCategories, startPoint, targetDistance);
                waypoints = bestVariant.waypoints;
                selectedPOIs.push(...bestVariant.selectedPOIs);
                
                this.currentVariantInfo = {
                    strategy: bestVariant.strategy,
                    description: bestVariant.description,
                    totalScore: bestVariant.totalScore,
                    estimatedDistance: bestVariant.estimatedDistance
                };
            }
            
            // Add custom POIs
            for (const poi of this.pois) {
                try {
                    const poiPoint = await this.geocode(poi);
                    if (poiPoint) {
                        waypoints.push(poiPoint);
                    }
                } catch (error) {
                    console.warn(`POI personnalisé ignoré: ${poi} - ${error.message}`);
                }
            }

            // Generate intermediate points if needed
            if (waypoints.length === 1) {
                waypoints = this.generateIntermediatePoints(startPoint, targetDistance);
            } else if (waypoints.length > 1) {
                waypoints = this.optimizeWaypointOrder(waypoints, targetDistance);
            }

            // Handle end point logic
            if (waypoints.length > 1) {
                if (this.returnToStart || !this.endPoint) {
                    // Return to start point
                    waypoints.push(waypoints[0]);
                } else {
                    // Go to specific end point
                    const endAddress = document.getElementById('endAddress').value.trim();
                    let endPoint;
                    
                    if (endAddress) {
                        endPoint = await this.geocode(endAddress);
                    } else if (this.endPoint) {
                        endPoint = this.endPoint.latlng;
                    }
                    
                    if (endPoint) {
                        waypoints.push(endPoint);
                    } else {
                        // Fallback to start if end point is invalid
                        waypoints.push(waypoints[0]);
                    }
                }
            }

            // Calculate and display route
            const route = await this.calculateRoute(waypoints);
            this.displayRoute(route);
            this.showResults(route);
            this.selectedPOIDetails = selectedPOIs;
            
            this.hideLoading();
            
            if (this.isMobile) {
                this.updateStatus('done', 100);
            }

        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
            
            if (this.isMobile) {
                this.updateStatus('start', 0);
            }
        }
    }

    /**
     * Generate route variants and select the best one
     */
    async generateRouteVariants(selectedCategories, startPoint, targetDistance) {
        const variants = [];
        const categoryPOIs = {};
        
        // Collect POIs for each category
        for (const checkbox of selectedCategories) {
            const categoryId = checkbox.value;
            const category = this.poiCategories.find(cat => cat.id === categoryId);
            
            if (category) {
                let allCategoryPOIs = [];
                
                for (const query of category.queries) {
                    try {
                        const queryPOIs = await this.findMultiplePOIs(query, startPoint, targetDistance, [startPoint]);
                        if (queryPOIs && queryPOIs.length > 0) {
                            allCategoryPOIs.push(...queryPOIs);
                        }
                    } catch (error) {
                        console.warn(`Erreur recherche "${query}": ${error.message}`);
                    }
                }
                
                const uniquePOIs = this.removeDuplicatePOIs(allCategoryPOIs);
                uniquePOIs.sort((a, b) => b.score - a.score);
                
                if (uniquePOIs.length > 0) {
                    categoryPOIs[categoryId] = {
                        category: category,
                        pois: uniquePOIs.slice(0, 3)
                    };
                }
            }
        }
        
        // Generate variants
        const variantSeed = this.currentSeed++;
        variants.push(...this.createRouteVariants(categoryPOIs, startPoint, targetDistance, variantSeed));
        
        if (variants.length === 0) {
            throw new Error('Aucune variante de parcours n\'a pu être générée');
        }
        
        // Score and rank variants
        const scoredVariants = await this.scoreRouteVariants(variants, targetDistance);
        
        if (scoredVariants.length === 0) {
            throw new Error('Impossible d\'évaluer les variantes de parcours');
        }
        
        return scoredVariants[0];
    }

    /**
     * Find multiple POIs for a query with enhanced scoring
     */
    async findMultiplePOIs(query, centerPoint, targetDistance, existingWaypoints = []) {
        try {
            const maxRadius = Math.min(targetDistance * 1000 / 4, 2000);
            const radiusDeg = maxRadius / 111000;
            
            const searchUrl = `https://nominatim.openstreetmap.org/search?` + 
                `format=json&` +
                `q=${encodeURIComponent(query)}&` +
                `limit=15&` +
                `countrycodes=fr&` +
                `lat=${centerPoint.lat}&` +
                `lon=${centerPoint.lng}&` +
                `bounded=1&` +
                `viewbox=${centerPoint.lng-radiusDeg},${centerPoint.lat+radiusDeg},${centerPoint.lng+radiusDeg},${centerPoint.lat-radiusDeg}`;
            
            const response = await fetch(searchUrl, { 
                headers: { 
                    'Accept-Language': 'fr',
                    'User-Agent': 'RunMyWay/1.0'
                } 
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const maxAcceptableDistance = targetDistance * 1000 / 3;
                
                const acceptablePOIs = data.filter(poi => {
                    const poiLatLng = L.latLng(parseFloat(poi.lat), parseFloat(poi.lon));
                    const distanceFromCenter = centerPoint.distanceTo(poiLatLng);
                    return distanceFromCenter <= maxAcceptableDistance;
                });
                
                if (acceptablePOIs.length === 0) {
                    return [];
                }
                
                // Enhanced scoring system
                const scoredPOIs = acceptablePOIs.map(poi => {
                    const poiLatLng = L.latLng(parseFloat(poi.lat), parseFloat(poi.lon));
                    const distanceFromCenter = centerPoint.distanceTo(poiLatLng);
                    
                    let minDistanceToExisting = Infinity;
                    existingWaypoints.forEach(wp => {
                        const distance = wp.distanceTo(poiLatLng);
                        minDistanceToExisting = Math.min(minDistanceToExisting, distance);
                    });
                    
                    let score = 0;
                    
                    // Proximity score (50%)
                    const proximityScore = (maxAcceptableDistance - distanceFromCenter) / maxAcceptableDistance * 50;
                    score += proximityScore;
                    
                    // Importance score (30%)
                    let importanceScore = 0;
                    const name = poi.display_name.toLowerCase();
                    const poiType = (poi.type || '').toLowerCase();
                    const poiClass = (poi.class || '').toLowerCase();
                    
                    if (name.includes('grand') || name.includes('grande')) importanceScore += 15;
                    if (name.includes('parc national') || name.includes('château') || name.includes('cathédrale')) importanceScore += 20;
                    if (poiClass === 'tourism' && poiType === 'attraction') importanceScore += 15;
                    if (poi.importance && poi.importance > 0.7) importanceScore += 10;
                    
                    score += Math.min(importanceScore, 30);
                    
                    // Diversity score (15%)
                    const diversityScore = Math.min(minDistanceToExisting / 500, 15);
                    score += diversityScore;
                    
                    // Type bonus (5%)
                    if (poiType.includes('park') || poiType.includes('garden')) score += 3;
                    if (poiType.includes('tourism')) score += 2;
                    
                    return {
                        latLng: poiLatLng,
                        name: poi.display_name,
                        distance: distanceFromCenter,
                        score: score,
                        importance: importanceScore
                    };
                });
                
                scoredPOIs.sort((a, b) => b.score - a.score);
                return scoredPOIs.slice(0, Math.min(5, scoredPOIs.length));
            }
            
            return [];
        } catch (error) {
            console.error('POI search error:', error);
            return [];
        }
    }

    /**
     * Geocode an address
     */
    async geocode(address) {
        if (this.apiCache.has(address)) {
            return this.apiCache.get(address);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=fr`,
                { 
                    headers: { 
                        'Accept-Language': 'fr',
                        'User-Agent': 'RunMyWay/1.0'
                    } 
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('Adresse introuvable');
            }
            
            const result = L.latLng(parseFloat(data[0].lat), parseFloat(data[0].lon));
            this.apiCache.set(address, result);
            
            return result;
        } catch (error) {
            console.error('Geocoding error:', error);
            throw new Error(`Géocodage échoué: ${error.message}`);
        }
    }

    /**
     * Reverse geocode coordinates to address
     */
    async reverseGeocode(latlng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
                { headers: { 'Accept-Language': 'fr' } }
            );
            const data = await response.json();
            return data.display_name || 'Position actuelle';
        } catch (error) {
            return 'Position actuelle';
        }
    }

    /**
     * Calculate route using OSRM
     */
    async calculateRoute(waypoints) {
        try {
            const mode = document.getElementById('travelMode').value;
            const profile = mode === 'cycling' ? 'cycling' : 'foot-walking';
            
            const coords = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.routes || data.routes.length === 0) {
                throw new Error('Aucun itinéraire trouvé');
            }

            return data.routes[0];
        } catch (error) {
            console.error('Routing error:', error);
            // Fallback to direct path
            const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
            if (coordinates.length > 0) {
                coordinates.push(coordinates[0]);
            }
            
            return {
                geometry: { coordinates: coordinates },
                distance: this.calculateDirectDistance(waypoints),
                duration: (this.calculateDirectDistance(waypoints) / 1000) * 720
            };
        }
    }

    /**
     * Add POI markers to the map during route display
     */
    addPOIMarkersToMap() {
        if (!this.selectedPOIDetails || this.selectedPOIDetails.length === 0) return;
        
        this.selectedPOIDetails.forEach(poi => {
            // Find the category data to get the icon
            const categoryData = this.poiCategories.find(cat => cat.name === poi.category);
            const poiIcon = categoryData ? categoryData.icon : '⭐';
            
            const marker = this.createCustomMarker(
                poi.poi.latLng || poi.latLng,
                'poi',
                {
                    poiIcon: poiIcon,
                    poiName: poi.name.split(',')[0] // Short name
                }
            ).addTo(this.map);
            
            // Create detailed popup
            const distanceKm = (poi.distance / 1000).toFixed(1);
            const importanceIndicator = poi.importance > 15 ? ' ⭐' : poi.importance > 10 ? ' 🔸' : '';
            
            marker.bindPopup(`
                <div style="font-size: 13px;">
                    <strong>${poiIcon} ${poi.name.split(',')[0]}</strong>${importanceIndicator}<br>
                    <small style="color: #666;">${poi.category}</small><br>
                    <small style="color: #4CAF50;">${distanceKm}km du départ</small>
                </div>
            `);
            
            // Store marker reference for cleanup
            this.markers.push(marker);
        });
    }

    /**
     * Display route on map
     */
    displayRoute(route) {
        this.clearRoute();

        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        this.routePolyline = L.polyline(coordinates, {
            color: '#4CAF50',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);

        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [20, 20] });
        this.currentRoute = route;
        
        // Add POI markers to the map
        this.addPOIMarkersToMap();
    }

    /**
     * Clear route from map
     */
    clearRoute() {
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }
        this.currentRoute = null;
        this.hideResults();
        
        // Remove POI markers (but keep start/waypoint markers)
        this.removePOIMarkers();
    }

    /**
     * Remove only POI markers from map
     */
    removePOIMarkers() {
        // Filter out POI markers but keep start/waypoint markers
        const markersToRemove = [];
        const markersToKeep = [];
        
        this.markers.forEach(marker => {
            const markerElement = marker.getElement();
            if (markerElement && markerElement.classList.contains('marker-poi')) {
                markersToRemove.push(marker);
                this.map.removeLayer(marker);
            } else {
                markersToKeep.push(marker);
            }
        });
        
        this.markers = markersToKeep;
    }

    /**
     * Reset application state
     */
    reset() {
        // Clear map markers and route
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        this.clearRoute();
        
        // Reset form inputs
        const startAddress = document.getElementById('startAddress');
        const targetDistance = document.getElementById('targetDistance');
        const poiInput = document.getElementById('poiInput');
        
        if (startAddress) startAddress.value = '';
        if (targetDistance) targetDistance.value = '5';
        if (poiInput) poiInput.value = '';
        
        // Clear POI selections
        const checkboxes = document.querySelectorAll('#poiCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.closest('.poi-item').classList.remove('selected');
        });
        
        // Clear custom POIs
        this.pois = [];
        this.updatePOIChips();
        
        // Hide results and errors
        this.hideResults();
        this.hideError();
        
        // Reset zoom to Paris
        this.map.setView([48.8566, 2.3522], 12);
        
        // Reset mobile status
        if (this.isMobile) {
            this.updateStatus('start', 0);
        }
    }

    /**
     * Add POI to custom list
     */
    addPOI() {
        const input = document.getElementById('poiInput');
        const poi = input.value.trim();
        
        if (poi && !this.pois.includes(poi)) {
            this.pois.push(poi);
            this.updatePOIChips();
            input.value = '';
        }
    }

    /**
     * Update POI chips display
     */
    updatePOIChips() {
        const container = document.getElementById('poiChips');
        if (!container) return;
        
        container.innerHTML = '';

        this.pois.forEach((poi, index) => {
            const chip = document.createElement('div');
            chip.className = 'poi-chip';
            chip.innerHTML = `
                <span>${poi}</span>
                <button class="poi-chip-remove" data-index="${index}" aria-label="Supprimer">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            const removeBtn = chip.querySelector('.poi-chip-remove');
            removeBtn.addEventListener('click', () => this.removePOI(index));
            
            container.appendChild(chip);
        });
    }

    /**
     * Remove POI from custom list
     */
    removePOI(index) {
        this.pois.splice(index, 1);
        this.updatePOIChips();
    }

    /**
     * Show address suggestions
     */
    async showStartAddressSuggestions(query, suggestionsDiv) {
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        if (timeSinceLastCall < 300) {
            return;
        }
        this.lastApiCall = now;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=fr`,
                { 
                    headers: { 
                        'Accept-Language': 'fr',
                        'User-Agent': 'RunMyWay/1.0'
                    } 
                }
            );
            
            if (!response.ok) return;
            
            const data = await response.json();
            this.renderStartAddressSuggestions(data, suggestionsDiv);
        } catch (error) {
            console.warn('Address suggestions failed:', error);
        }
    }

    /**
     * Show end address suggestions
     */
    async showEndAddressSuggestions(query, suggestionsDiv) {
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        if (timeSinceLastCall < 300) {
            return;
        }
        this.lastApiCall = now;
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=fr`,
                { 
                    headers: { 
                        'Accept-Language': 'fr',
                        'User-Agent': 'RunMyWay/1.0'
                    } 
                }
            );
            
            if (!response.ok) return;
            
            const data = await response.json();
            this.renderEndAddressSuggestions(data, suggestionsDiv);
        } catch (error) {
            console.warn('End address suggestions failed:', error);
        }
    }

    /**
     * Render address suggestions
     */
    renderStartAddressSuggestions(suggestions, suggestionsDiv) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = '';
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.display_name;
            item.addEventListener('click', () => {
                document.getElementById('startAddress').value = suggestion.display_name;
                suggestionsDiv.style.display = 'none';
            });
            suggestionsDiv.appendChild(item);
        });
        suggestionsDiv.style.display = 'block';
    }

    /**
     * Render end address suggestions
     */
    renderEndAddressSuggestions(suggestions, suggestionsDiv) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        suggestionsDiv.innerHTML = '';
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.display_name;
            
            item.addEventListener('click', () => {
                document.getElementById('endAddress').value = suggestion.display_name;
                suggestionsDiv.style.display = 'none';
                
                // Clear existing end point and set new one
                this.clearEndPoint();
                const marker = this.createCustomMarker(
                    [parseFloat(suggestion.lat), parseFloat(suggestion.lon)], 
                    'end'
                ).addTo(this.map);
                marker.bindPopup('🏁 Point d\'arrivée');
                this.endPoint = { 
                    latlng: [parseFloat(suggestion.lat), parseFloat(suggestion.lon)], 
                    marker 
                };
                this.markers.push(marker);
            });
            
            suggestionsDiv.appendChild(item);
        });
        
        suggestionsDiv.style.display = 'block';
    }

    /**
     * Show POI suggestions
     */
    async showPOISuggestions(query, suggestionsDiv) {
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const suggestions = [];
        
        // Add matching categories
        const matchingCategories = this.poiCategories.filter(category => 
            category.name.toLowerCase().includes(query.toLowerCase()) ||
            category.queries.some(q => q.toLowerCase().includes(query.toLowerCase()))
        );
        
        suggestions.push(...matchingCategories.map(category => ({
            display: `${category.icon} ${category.name}`,
            query: category.queries[0],
            isPredefined: true
        })));

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=fr`,
                { 
                    headers: { 
                        'Accept-Language': 'fr',
                        'User-Agent': 'RunMyWay/1.0'
                    } 
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    data.forEach(item => {
                        if (item && item.display_name) {
                            suggestions.push({
                                display: item.display_name,
                                query: item.display_name,
                                isPredefined: false
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('POI suggestions failed:', error);
        }

        this.renderPOISuggestions(suggestions.slice(0, 8), suggestionsDiv);
    }

    /**
     * Render POI suggestions
     */
    renderPOISuggestions(suggestions, suggestionsDiv) {
        if (suggestions.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item ${suggestion.isPredefined ? 'predefined' : ''}" data-query="${suggestion.query}">
                ${suggestion.isPredefined ? '📍 ' : ''}${suggestion.display}
            </div>
        `).join('');

        suggestionsDiv.style.display = 'block';

        suggestionsDiv.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const input = document.getElementById('poiInput');
                input.value = item.dataset.query;
                suggestionsDiv.style.display = 'none';
                this.addPOI();
            });
        });
    }

    /**
     * Export route as GPX
     */
    exportGPX() {
        if (!this.currentRoute) {
            this.showError('Aucun parcours à exporter');
            return;
        }

        const coordinates = this.currentRoute.geometry.coordinates;
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunMyWay" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Parcours RunMyWay</name>
    <trkseg>`;

        coordinates.forEach(coord => {
            gpx += `\n      <trkpt lat="${coord[1]}" lon="${coord[0]}"></trkpt>`;
        });

        gpx += `
    </trkseg>
  </trk>
</gpx>`;

        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parcours-runmyway-${new Date().toISOString().slice(0, 10)}.gpx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show detailed route explanation
     */
    showRouteExplanation(route) {
        const explanationDiv = document.getElementById('routeExplanation');
        if (!explanationDiv) return;
        
        let explanation = '';
        
        const targetDistance = parseFloat(document.getElementById('targetDistance').value);
        const actualDistance = (route.distance / 1000).toFixed(1);
        const distanceDiff = Math.abs(actualDistance - targetDistance).toFixed(1);
        
        explanation += `<div style="margin-bottom: 1rem;"><strong>🎯 Analyse du parcours:</strong><br>`;
        explanation += `Distance cible: ${targetDistance}km | Distance réelle: ${actualDistance}km`;
        
        if (distanceDiff > targetDistance * 0.2) {
            explanation += ` <span style="color: var(--error-color);">(écart: +${distanceDiff}km)</span>`;
        } else if (distanceDiff > targetDistance * 0.1) {
            explanation += ` <span style="color: var(--warning-color);">(écart: +${distanceDiff}km)</span>`;
        } else {
            explanation += ` <span style="color: var(--success-color);">(✓ proche)</span>`;
        }
        explanation += '</div>';
        
        if (this.currentVariantInfo) {
            explanation += `<div style="margin-bottom: 1rem;"><strong>🔄 Stratégie:</strong> ${this.currentVariantInfo.description}<br>`;
            explanation += `<strong>📊 Score d'optimisation:</strong> ${this.currentVariantInfo.totalScore.toFixed(1)}/100</div>`;
        }
        
        if (this.selectedPOIDetails && this.selectedPOIDetails.length > 0) {
            explanation += '<div style="margin-bottom: 1rem;"><strong>📍 Points d\'intérêt de votre parcours:</strong><br>';
            
            const poiByCategory = {};
            this.selectedPOIDetails.forEach(poi => {
                if (!poiByCategory[poi.category]) {
                    poiByCategory[poi.category] = [];
                }
                poiByCategory[poi.category].push(poi);
            });
            
            Object.keys(poiByCategory).forEach(category => {
                const pois = poiByCategory[category];
                const categoryData = this.poiCategories.find(cat => cat.name === category);
                const icon = categoryData ? categoryData.icon : '📍';
                
                explanation += `<div style="margin: 0.5rem 0; padding: 0.5rem; background: var(--bg-surface); border-radius: var(--border-radius-sm);">`;
                explanation += `<strong>${icon} ${category} (${pois.length}):</strong><br>`;
                
                pois.forEach(poi => {
                    const distanceKm = (poi.distance / 1000).toFixed(1);
                    const shortName = poi.name.split(',')[0];
                    const importanceIndicator = poi.importance > 15 ? ' ⭐' : poi.importance > 10 ? ' 🔸' : '';
                    explanation += `  • <strong>${shortName}</strong>${importanceIndicator} (${distanceKm}km)<br>`;
                });
                explanation += '</div>';
            });
            
            const totalPOIs = this.selectedPOIDetails.length;
            const uniqueCategories = Object.keys(poiByCategory).length;
            explanation += `<em style="color: var(--primary-color);">Total: ${totalPOIs} POI dans ${uniqueCategories} catégorie${uniqueCategories > 1 ? 's' : ''}</em></div>`;
        }
        
        explanationDiv.innerHTML = explanation;
    }

    /**
     * Helper methods for route generation
     */
    removeDuplicatePOIs(pois) {
        const unique = [];
        const threshold = 100;
        
        for (const poi of pois) {
            let isDuplicate = false;
            for (const existing of unique) {
                if (poi.latLng.distanceTo(existing.latLng) < threshold) {
                    isDuplicate = true;
                    if (poi.score > existing.score) {
                        const index = unique.indexOf(existing);
                        unique[index] = poi;
                    }
                    break;
                }
            }
            if (!isDuplicate) {
                unique.push(poi);
            }
        }
        
        return unique;
    }

    createRouteVariants(categoryPOIs, startPoint, targetDistance, seed) {
        const variants = [];
        const categoryIds = Object.keys(categoryPOIs);
        
        if (categoryIds.length === 0) return variants;
        
        // Strategy 1: Best from each category
        let bestFromEach = [startPoint];
        let selectedPOIs = [];
        
        categoryIds.forEach(categoryId => {
            const categoryData = categoryPOIs[categoryId];
            if (categoryData.pois.length > 0) {
                const bestPOI = categoryData.pois[0];
                bestFromEach.push(bestPOI.latLng);
                selectedPOIs.push({
                    category: categoryData.category.name,
                    name: bestPOI.name,
                    distance: bestPOI.distance,
                    importance: bestPOI.importance,
                    poi: bestPOI
                });
            }
        });
        
        if (selectedPOIs.length > 0) {
            variants.push({
                waypoints: bestFromEach,
                selectedPOIs: selectedPOIs,
                strategy: 'best-from-each',
                description: `Meilleurs POI de chaque catégorie (${selectedPOIs.length} POI)`
            });
        }
        
        return variants;
    }

    async scoreRouteVariants(variants, targetDistance) {
        const scoredVariants = [];
        
        for (const variant of variants) {
            try {
                let estimatedDistance = 0;
                const waypoints = variant.waypoints;
                
                for (let i = 0; i < waypoints.length - 1; i++) {
                    estimatedDistance += waypoints[i].distanceTo(waypoints[i + 1]);
                }
                if (waypoints.length > 1) {
                    estimatedDistance += waypoints[waypoints.length - 1].distanceTo(waypoints[0]);
                }
                
                const estimatedKm = estimatedDistance / 1000;
                let totalScore = 0;
                
                const distanceRatio = Math.abs(estimatedKm - targetDistance) / targetDistance;
                const distanceScore = Math.max(0, (1 - distanceRatio) * 40);
                totalScore += distanceScore;
                
                const totalImportance = variant.selectedPOIs.reduce((sum, poi) => sum + (poi.importance || 0), 0);
                const importanceScore = Math.min(totalImportance / 2, 35);
                totalScore += importanceScore;
                
                scoredVariants.push({
                    ...variant,
                    estimatedDistance: estimatedKm,
                    totalScore,
                    importantPOIs: variant.selectedPOIs.map(poi => poi.name.split(',')[0]).slice(0, 2)
                });
                
            } catch (error) {
                console.warn(`Erreur évaluation variante: ${error.message}`);
            }
        }
        
        scoredVariants.sort((a, b) => b.totalScore - a.totalScore);
        return scoredVariants;
    }

    generateIntermediatePoints(start, targetKm) {
        const points = [start];
        const radiusKm = Math.min(targetKm / 3, 3);
        const radiusDeg = radiusKm / 111;
        const numPoints = targetKm > 8 ? 2 : 1;
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i * 2 * Math.PI / numPoints) + Math.random() * Math.PI / 2;
            const distance = radiusDeg * (0.7 + Math.random() * 0.3);
            
            points.push(L.latLng(
                start.lat + Math.cos(angle) * distance,
                start.lng + Math.sin(angle) * distance
            ));
        }

        return points;
    }

    optimizeWaypointOrder(waypoints, targetKm) {
        if (waypoints.length <= 2) return waypoints;
        
        const start = waypoints[0];
        const others = waypoints.slice(1);
        const optimized = [start];
        const remaining = [...others];
        
        let current = start;
        while (remaining.length > 0) {
            let nearest = remaining[0];
            let nearestIndex = 0;
            let minDistance = current.distanceTo(nearest);
            
            for (let i = 1; i < remaining.length; i++) {
                const distance = current.distanceTo(remaining[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = remaining[i];
                    nearestIndex = i;
                }
            }
            
            optimized.push(nearest);
            remaining.splice(nearestIndex, 1);
            current = nearest;
        }
        
        return optimized;
    }

    calculateDirectDistance(waypoints) {
        let totalDistance = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            totalDistance += waypoints[i].distanceTo(waypoints[i + 1]);
        }
        if (waypoints.length > 0) {
            totalDistance += waypoints[waypoints.length - 1].distanceTo(waypoints[0]);
        }
        return totalDistance;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.runMyWayApp = new RunMyWayApp();
    window.runMyWayApp.init().catch(error => {
        console.error('Failed to initialize RunMyWay app:', error);
    });
});