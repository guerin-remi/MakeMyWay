/**
 * Gestionnaire des Points d'Intérêt (POI) pour MakeMyWay
 * Gère l'ajout, la suppression et l'affichage des POI
 */
export class POIManager {
    constructor(apiService, mapManager, elements) {
        this.apiService = apiService;
        this.mapManager = mapManager;
        
        // Éléments DOM
        this.elements = {
            poiChips: elements.poiChips,
            poiCategories: elements.poiCategories,
            customPoi: elements.customPoi
        };
        
        // État
        this.pois = [];
    }

    /**
     * Active/désactive une catégorie POI
     * @param {HTMLElement} categoryElement - Élément de catégorie cliqué
     * @param {Object} startPoint - Point de départ pour la recherche
     */
    async togglePOICategory(categoryElement, startPoint) {
        const category = categoryElement.dataset.preset;
        if (!category) return;

        const isActive = categoryElement.classList.contains('active');
        
        if (isActive) {
            // Désactiver la catégorie
            categoryElement.classList.remove('active');
            this.removePOIsByCategory(category);
        } else {
            // Vérifier qu'un point de départ est défini
            if (!startPoint) {
                throw new Error('Veuillez d\'abord définir un point de départ');
            }
            
            // Activer la catégorie
            categoryElement.classList.add('active');
            await this.addPOIsByCategory(category, startPoint);
        }
    }

    /**
     * Ajoute des POI par catégorie
     * @param {string} category - Catégorie de POI
     * @param {Object} startPoint - Point de départ pour la recherche
     */
    async addPOIsByCategory(category, startPoint) {
        const pois = await this.apiService.searchPOIsByCategory(category, startPoint);
        
        pois.forEach(poi => this.addPOIToList(poi));
        
        if (pois.length === 0) {
            throw new Error(`Aucun POI ${category} trouvé dans cette zone`);
        } else {
            console.log(`✅ ${pois.length} POI ${category} ajoutés`);
        }
        
        return pois;
    }

    /**
     * Supprime les POI d'une catégorie
     * @param {string} category - Catégorie à supprimer
     */
    removePOIsByCategory(category) {
        const poisToRemove = this.pois.filter(poi => poi.category === category);
        
        poisToRemove.forEach(poi => {
            const index = this.pois.indexOf(poi);
            if (index > -1) {
                this.removePOI(index);
            }
        });
        
        console.log(`🗑️ POI ${category} supprimés`);
    }

    /**
     * Ajoute un POI personnalisé
     * @param {string} query - Recherche utilisateur
     * @param {Object} searchCenter - Centre de recherche
     */
    async addCustomPOI(query, searchCenter) {
        if (query.length < 2) {
            throw new Error('Veuillez saisir au moins 2 caractères');
        }

        // Recherche avec Google Places
        const pois = await this.apiService.searchCustomPOI(query, searchCenter, 5);
        
        if (pois.length > 0) {
            const poi = pois[0];
            this.addPOIToList(poi);
            console.log(`✅ POI personnalisé ajouté: ${poi.name}`);
            return poi;
        } else {
            throw new Error('Aucun lieu trouvé pour cette recherche');
        }
    }

    /**
     * Ajoute un POI à la liste
     * @param {Object} poi - POI à ajouter
     */
    addPOIToList(poi) {
        // Éviter les doublons
        const exists = this.pois.find(p => 
            Math.abs(p.lat - poi.lat) < 0.001 && Math.abs(p.lng - poi.lng) < 0.001
        );
        
        if (exists) {
            throw new Error('Ce POI est déjà dans votre liste');
        }
        
        // Ajouter à la liste
        this.pois.push(poi);
        this.updatePOIChips();
        
        // Ajouter le marqueur sur la carte
        poi._marker = this.mapManager.addPOIMarker(poi);
        
        console.log(`✅ POI ajouté: ${poi.name}`);
    }

    /**
     * Met à jour l'affichage des chips POI
     */
    updatePOIChips() {
        const container = this.elements.poiChips;
        if (!container) return;

        container.innerHTML = '';

        this.pois.forEach((poi, index) => {
            const chip = document.createElement('div');
            chip.className = 'poi-chip';
            chip.innerHTML = `
                <span>${this.apiService.getPOITypeIcon(poi.type)} ${poi.name}</span>
                <button class="chip-remove" data-index="${index}" title="Supprimer">×</button>
            `;
            
            // Événement de suppression
            const removeBtn = chip.querySelector('.chip-remove');
            removeBtn.addEventListener('click', () => this.removePOI(index));
            
            container.appendChild(chip);
        });
    }

    /**
     * Supprime un POI de la liste
     * @param {number} index - Index du POI à supprimer
     */
    removePOI(index) {
        if (index >= 0 && index < this.pois.length) {
            const poi = this.pois[index];
            
            // Supprimer de la carte
            if (poi._marker) {
                this.mapManager.removePOIMarker(poi._marker);
            }
            
            // Supprimer de la liste
            this.pois.splice(index, 1);
            this.updatePOIChips();
            
            console.log(`🗑️ POI supprimé: ${poi.name}`);
        }
    }

    /**
     * Remet à zéro tous les POI
     */
    reset() {
        // Supprimer tous les marqueurs de la carte
        this.pois.forEach(poi => {
            if (poi._marker) {
                this.mapManager.removePOIMarker(poi._marker);
            }
        });
        
        // Vider la liste
        this.pois = [];
        this.updatePOIChips();
        
        // Désactiver toutes les catégories POI
        if (this.elements.poiCategories) {
            this.elements.poiCategories.forEach(category => {
                category.classList.remove('active');
            });
        }
        
        // Vider le champ de saisie personnalisé
        if (this.elements.customPoi) {
            this.elements.customPoi.value = '';
        }
        
        console.log('🗑️ Tous les POI ont été supprimés');
    }

    /**
     * Obtient la liste des POI
     * @returns {Array} Liste des POI
     */
    getPOIs() {
        return [...this.pois];
    }

    /**
     * Définit la liste des POI
     * @param {Array} pois - Nouvelle liste de POI
     */
    setPOIs(pois) {
        this.pois = [...pois];
        this.updatePOIChips();
    }
}