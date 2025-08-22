/**
 * Gestionnaire des résultats de parcours pour MakeMyWay
 * Gère l'affichage et le masquage des résultats de génération
 */
export class ResultsManager {
    constructor(elements, routeGenerator) {
        this.routeGenerator = routeGenerator;
        
        // Éléments DOM
        this.elements = {
            resultsPanel: elements.resultsPanel,
            distanceResult: elements.distanceResult,
            durationResult: elements.durationResult,
            deviationResult: elements.deviationResult
        };
    }

    /**
     * Affiche les résultats du parcours
     * @param {Object} routeData - Données du parcours
     */
    showResults(routeData) {
        if (!this.elements.resultsPanel) return;

        const metadata = this.routeGenerator.getLastRouteMetadata();
        if (!metadata) return;

        // Calculer les statistiques
        const actualDistance = routeData.distance;
        const estimatedDuration = routeData.duration;
        const deviation = Math.abs(actualDistance - metadata.targetDistance);
        
        // Mettre à jour les éléments de résultat
        if (this.elements.distanceResult) {
            this.elements.distanceResult.textContent = `${actualDistance.toFixed(1)} km`;
        }
        
        if (this.elements.durationResult) {
            this.elements.durationResult.textContent = this.formatDuration(estimatedDuration);
        }
        
        if (this.elements.deviationResult) {
            const deviationPercent = (deviation / metadata.targetDistance) * 100;
            
            if (deviationPercent <= 5) {
                this.elements.deviationResult.textContent = '✓ Parfait';
                this.elements.deviationResult.style.color = 'var(--success)';
            } else if (deviationPercent <= 15) {
                this.elements.deviationResult.textContent = `±${deviation.toFixed(1)}km`;
                this.elements.deviationResult.style.color = 'var(--warning)';
            } else {
                this.elements.deviationResult.textContent = `±${deviation.toFixed(1)}km`;
                this.elements.deviationResult.style.color = 'var(--error)';
            }
        }

        // Afficher les POI inclus dans le parcours
        this.displayIncludedPOIs();

        // Afficher le panneau avec animation
        setTimeout(() => {
            this.elements.resultsPanel.classList.add('show');
        }, 500);

        console.log(`📊 Résultats: ${actualDistance.toFixed(1)}km en ${this.formatDuration(estimatedDuration)}`);
    }

    /**
     * Masque les résultats
     */
    hideResults() {
        if (this.elements.resultsPanel) {
            this.elements.resultsPanel.classList.remove('show');
        }
    }

    /**
     * Formate une durée en format lisible
     * @param {number} minutes - Durée en minutes
     * @returns {string} Durée formatée
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);
            return remainingMinutes > 0 ? `${hours}h${remainingMinutes.toString().padStart(2, '0')}` : `${hours}h`;
        }
    }

    /**
     * Affiche les POI inclus dans le parcours
     */
    displayIncludedPOIs() {
        // Récupérer les POI depuis l'UIManager
        if (!window.uiManager || !window.uiManager.poiManager) return;
        
        const pois = window.uiManager.poiManager.getPOIs();
        if (pois.length === 0) return;

        // Créer ou mettre à jour l'affichage des POI
        let poiContainer = document.querySelector('.route-poi-summary');
        if (!poiContainer) {
            poiContainer = document.createElement('div');
            poiContainer.className = 'route-poi-summary';
            
            // Insérer après les résultats principaux
            const resultsContent = this.elements.resultsPanel?.querySelector('.results-content');
            if (resultsContent) {
                resultsContent.appendChild(poiContainer);
            }
        }

        // Grouper les POI par catégorie
        const poiByCategory = {};
        pois.forEach(poi => {
            const category = poi.category || 'custom';
            if (!poiByCategory[category]) {
                poiByCategory[category] = [];
            }
            poiByCategory[category].push(poi);
        });

        // Construire le HTML
        let html = `
            <div class="poi-summary-header">
                <h4>🎯 Points d'intérêt inclus (${pois.length})</h4>
            </div>
            <div class="poi-categories">
        `;

        Object.entries(poiByCategory).forEach(([category, categoryPOIs]) => {
            const categoryIcon = this.getCategoryIcon(category);
            const categoryLabel = this.getCategoryLabel(category);
            
            html += `
                <div class="poi-category-summary">
                    <span class="category-badge">${categoryIcon} ${categoryLabel} (${categoryPOIs.length})</span>
                    <div class="poi-list">
            `;
            
            categoryPOIs.forEach(poi => {
                html += `<span class="poi-name">• ${poi.name}</span>`;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div class="poi-optimization-note">
                <small>📍 Ordre optimisé pour minimiser les détours</small>
            </div>
        `;

        poiContainer.innerHTML = html;

        // Ajouter les styles si pas encore fait
        this.addPOISummaryStyles();
    }

    /**
     * Obtient l'icône d'une catégorie
     * @param {string} category - Catégorie
     * @returns {string} Icône
     */
    getCategoryIcon(category) {
        const icons = {
            nature: '🌳',
            culture: '🏛️',
            sport: '🏃',
            panorama: '🏔️',
            eau: '💧',
            water: '💧',
            shopping: '🛍️',
            cafe: '☕',
            bench: '🪑',
            toilet: '🚻',
            shade: '🌳',
            bike_service: '🚲',
            bike_parking: '🅿️',
            rest_area: '🛤️',
            custom: '📍'
        };
        return icons[category] || '📍';
    }

    /**
     * Obtient le label d'une catégorie
     * @param {string} category - Catégorie
     * @returns {string} Label
     */
    getCategoryLabel(category) {
        const labels = {
            nature: 'Nature',
            culture: 'Culture',
            sport: 'Sport',
            panorama: 'Points de vue',
            eau: 'Points d\'eau',
            water: 'Points d\'eau',
            shopping: 'Shopping',
            cafe: 'Cafés',
            bench: 'Aires de repos',
            toilet: 'Toilettes',
            shade: 'Zones ombragées',
            bike_service: 'Services vélo',
            bike_parking: 'Parking vélo',
            rest_area: 'Aires de repos',
            custom: 'Personnalisé'
        };
        return labels[category] || 'Autre';
    }

    /**
     * Ajoute les styles pour le résumé des POI
     */
    addPOISummaryStyles() {
        if (document.getElementById('poi-summary-styles')) return;

        const style = document.createElement('style');
        style.id = 'poi-summary-styles';
        style.textContent = `
            .route-poi-summary {
                margin-top: var(--space-3);
                padding: var(--space-3);
                background: rgba(147, 51, 234, 0.05);
                border-radius: var(--radius-lg);
                border: 1px solid rgba(147, 51, 234, 0.1);
            }

            .poi-summary-header h4 {
                margin: 0 0 var(--space-2) 0;
                color: var(--primary);
                font-size: 1rem;
            }

            .poi-category-summary {
                margin-bottom: var(--space-2);
            }

            .category-badge {
                display: inline-block;
                background: var(--primary);
                color: white;
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-full);
                font-size: 0.85rem;
                font-weight: 500;
                margin-bottom: var(--space-1);
            }

            .poi-list {
                margin-left: var(--space-2);
                font-size: 0.9rem;
                color: var(--text-secondary);
            }

            .poi-name {
                display: block;
                margin-bottom: 2px;
            }

            .poi-optimization-note {
                text-align: center;
                margin-top: var(--space-2);
                padding-top: var(--space-2);
                border-top: 1px solid rgba(147, 51, 234, 0.1);
                color: var(--text-secondary);
            }

            @media (max-width: 768px) {
                .route-poi-summary {
                    margin: var(--space-2) 0;
                    padding: var(--space-2);
                }
                
                .category-badge {
                    font-size: 0.8rem;
                    padding: 4px var(--space-1);
                }
            }
        `;
        document.head.appendChild(style);
    }
}