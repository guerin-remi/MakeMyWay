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
}