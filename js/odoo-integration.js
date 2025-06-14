// ===== INTÉGRATION ODOO - Gestion de l'authentification et des rendez-vous =====

class OdooIntegration {
    constructor(core) {
        this.core = core;
        this.currentUser = null;
    }

    // ===== AUTHENTIFICATION =====
    
    async checkUserAuthentication() {
        try {
            console.log('🔍 Vérification de l\'authentification...');

            const userInfo = await this.fetchUserInfo();
            if (userInfo) {
                console.log('✅ Utilisateur connecté:', userInfo.name);
                this.currentUser = userInfo;
                this.core.currentUser = userInfo;
                this.showUserInfo();
                return true;
            } else {
                console.log('❌ Utilisateur non connecté');
                this.currentUser = null;
                this.core.currentUser = null;
                this.hideUserInfo();
                return false;
            }

        } catch (error) {
            console.error('⚠️ Erreur vérification auth:', error);
            this.currentUser = null;
            this.core.currentUser = null;
            this.hideUserInfo();
            return false;
        }
    }

    async fetchUserInfo() {
        try {
            // Méthode 1: Vérifier via session info
            const sessionResponse = await fetch(this.core.config.odoo.userInfoUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();

                if (sessionData.result && sessionData.result.uid && sessionData.result.uid !== false) {
                    const userDetails = await this.fetchUserDetails(sessionData.result.uid);

                    return {
                        id: sessionData.result.uid,
                        name: userDetails?.name || sessionData.result.name || sessionData.result.username || 'Utilisateur',
                        email: userDetails?.email || sessionData.result.username || '',
                        phone: userDetails?.phone || userDetails?.mobile || '',
                        partner_id: userDetails?.partner_id || sessionData.result.partner_id,
                        session_id: sessionData.result.session_id,
                        is_portal_user: true
                    };
                }
            }

            // Méthode 2: Tester l'accès au portail directement
            const portalResponse = await fetch(this.core.config.odoo.portalUrl, {
                method: 'HEAD',
                credentials: 'include'
            });

            if (portalResponse.ok && portalResponse.url === this.core.config.odoo.portalUrl) {
                return await this.extractUserInfoFromPortal();
            }

            return null;
        } catch (error) {
            console.error('Erreur fetch user info:', error);
            return null;
        }
    }

    async fetchUserDetails(userId) {
        try {
            const response = await fetch(`${this.core.config.odoo.serverUrl}/web/dataset/call_kw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'res.users',
                        method: 'read',
                        args: [[userId], ['name', 'email', 'phone', 'mobile', 'partner_id']],
                        kwargs: {}
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.result && result.result.length > 0) {
                    const user = result.result[0];
                    return {
                        name: user.name,
                        email: user.email,
                        phone: user.phone || user.mobile,
                        partner_id: user.partner_id ? user.partner_id[0] : null
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Erreur récupération détails utilisateur:', error);
            return null;
        }
    }

    async extractUserInfoFromPortal() {
        try {
            const response = await fetch(this.core.config.odoo.portalUrl, {
                credentials: 'include'
            });

            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const userNameElement = doc.querySelector('.o_portal_navbar .dropdown-toggle');
                const userName = userNameElement ? userNameElement.textContent.trim() : 'Utilisateur';

                return {
                    id: null,
                    name: userName,
                    email: '',
                    phone: '',
                    partner_id: null,
                    is_portal_user: true,
                    extracted_from_portal: true
                };
            }

            return null;
        } catch (error) {
            console.error('Erreur extraction portail:', error);
            return null;
        }
    }

    showUserInfo() {
        const userInfo = document.getElementById('userInfo');
        const userWelcome = document.getElementById('userWelcome');

        if (this.currentUser) {
            const firstName = this.currentUser.name.split(' ')[0];
            userWelcome.textContent = `Connecté (${firstName})`;
            userInfo.classList.add('visible');
        }
    }

    hideUserInfo() {
        const userInfo = document.getElementById('userInfo');
        userInfo.classList.remove('visible');
    }

    // ===== GESTION DES RENDEZ-VOUS =====
    
    async checkAuthenticationAndShowForm() {
        const isAuthenticated = await this.checkUserAuthentication();

        if (isAuthenticated) {
            this.redirectToAppointmentPage();
        } else {
            this.showLoginSection();
        }
    }

    redirectToAppointmentPage() {
        // Mapper les données du configurateur vers les champs Odoo
        const appointmentData = {
            'question_marque_appareil': this.getBrandForOdoo(this.core.userSelections.brand),
            'question_type_reparation': this.getRepairTypeForOdoo(this.core.userSelections.repair),
            'question_modele_appareil': `${this.core.userSelections.series} ${this.core.userSelections.model}`,
            'question_qualite_piece': this.core.userSelections.quality,
            'estimated_price': this.core.elements.priceMain.textContent,
            'estimated_duration': this.core.elements.timeEstimate.textContent,
            'source': 'configurateur',
            'configurator_data': JSON.stringify({
                repair: this.core.userSelections.repair,
                brand: this.core.userSelections.brand,
                series: this.core.userSelections.series,
                model: this.core.userSelections.model,
                quality: this.core.userSelections.quality,
                price: this.core.elements.priceMain.textContent,
                duration: this.core.elements.timeEstimate.textContent
            })
        };

        // Sauvegarder dans localStorage
        const fullAppointmentData = {
            userSelections: this.core.userSelections,
            priceInfo: {
                price: this.core.elements.priceMain.textContent,
                duration: this.core.elements.timeEstimate.textContent,
                repairType: this.core.elements.repairType.textContent,
                deviceInfo: this.core.elements.deviceInfo.textContent,
                qualityInfo: this.core.elements.qualityInfo.textContent
            },
            customerInfo: this.currentUser ? {
                name: this.currentUser.name,
                email: this.currentUser.email,
                phone: this.currentUser.phone || '',
                partner_id: this.currentUser.partner_id
            } : null,
            timestamp: new Date().toISOString(),
            source: 'configurateur_web',
            expires: new Date(Date.now() + this.core.config.storage.expirationTime).toISOString()
        };

        localStorage.setItem(this.core.config.storage.appointmentDataKey, JSON.stringify(fullAppointmentData));

        // Construire l'URL avec les paramètres
        const params = new URLSearchParams();
        Object.keys(appointmentData).forEach(key => {
            if (appointmentData[key]) {
                params.append(key, appointmentData[key]);
            }
        });

        const appointmentUrl = `${this.core.config.odoo.appointmentUrl}?${params.toString()}`;

        console.log('🚀 Redirection vers:', appointmentUrl);
        console.log('📋 Données sauvegardées:', fullAppointmentData);

        window.location.href = appointmentUrl;
    }

    getBrandForOdoo(brand) {
        return this.core.config.mappings.brands[brand] || brand.toUpperCase();
    }

    getRepairTypeForOdoo(repairType) {
        return this.core.config.mappings.repairTypes[repairType] || 'Réparation Smartphone';
    }

    // ===== FORMULAIRE DE RENDEZ-VOUS =====
    
    showAppointmentForm() {
        const appointmentForm = document.getElementById('appointmentForm');
        const contactBtn = this.core.elements.contactBtn;

        // Remplir le récapitulatif
        document.getElementById('summaryRepairText').textContent = this.core.userSelections.repair;
        document.getElementById('summaryDeviceText').textContent = `${this.core.userSelections.brand} ${this.core.userSelections.series} ${this.core.userSelections.model}`;
        document.getElementById('summaryQualityText').textContent = this.core.userSelections.quality;
        document.getElementById('summaryPriceText').textContent = this.core.elements.priceMain.textContent;
        document.getElementById('summaryTimeText').textContent = this.core.elements.timeEstimate.textContent;

        // Pré-remplir avec les informations utilisateur
        if (this.currentUser) {
            document.getElementById('customerName').value = this.currentUser.name;
            document.getElementById('customerEmail').value = this.currentUser.email || '';
            document.getElementById('customerPhone').value = this.currentUser.phone || '';

            // Permettre la modification si informations incomplètes
            if (!this.currentUser.email || this.currentUser.extracted_from_portal) {
                const emailField = document.getElementById('customerEmail');
                emailField.removeAttribute('readonly');
                emailField.style.background = 'white';
                emailField.setAttribute('placeholder', this.core.texts.appointment.form.placeholders.email);
            }

            if (!this.currentUser.phone) {
                document.getElementById('customerPhone').setAttribute('placeholder', this.core.texts.appointment.form.placeholders.phoneOptional);
            }
        }

        // Définir la date minimale à demain
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('appointmentDate').min = tomorrow.toISOString().split('T')[0];

        contactBtn.style.display = 'none';
        appointmentForm.style.display = 'block';
    }

    async submitAppointment() {
        const submitBtn = document.querySelector('.btn-appointment');

        // Validation des champs obligatoires
        const date = document.getElementById('appointmentDate').value;
        const time = document.getElementById('appointmentTime').value;

        if (!date || !time) {
            alert(this.core.texts.errors.dateTime);
            return;
        }

        // Vérifier que l'utilisateur est toujours connecté
        if (!this.currentUser) {
            alert(this.core.texts.errors.sessionExpired);
            await this.checkAuthenticationAndShowForm();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = this.core.texts.loading.appointment;

        try {
            const appointmentData = {
                name: `Réparation ${this.core.userSelections.repair} - ${this.currentUser.name}`,
                partner_id: this.currentUser.partner_id,
                partner_name: this.currentUser.name,
                partner_email: this.currentUser.email,
                partner_phone: document.getElementById('customerPhone').value.trim() || this.currentUser.phone,
                start: `${date} ${time}:00`,
                stop: this.calculateEndTime(date, time, this.core.userSelections.repair),
                description: this.generateAppointmentDescription(),
                categ_ids: this.getRepairCategoryId(this.core.userSelections.repair),
                repair_type: this.core.userSelections.repair,
                device_brand: this.core.userSelections.brand,
                device_series: this.core.userSelections.series,
                device_model: this.core.userSelections.model,
                part_quality: this.core.userSelections.quality,
                estimated_price: this.core.elements.priceMain.textContent,
                customer_comments: document.getElementById('customerComments').value.trim(),
                user_id: this.currentUser.id,
                customer_id: this.currentUser.partner_id
            };

            const success = await this.createOdooAppointment(appointmentData);

            if (success) {
                this.showSuccessMessage();
            } else {
                throw new Error('Erreur lors de la création du rendez-vous');
            }

        } catch (error) {
            console.error('Erreur:', error);
            alert(this.core.texts.errors.appointmentFailed);
            submitBtn.disabled = false;
            submitBtn.textContent = this.core.texts.buttons.confirm;
        }
    }

    calculateEndTime(date, startTime, repairType) {
        const start = new Date(`${date} ${startTime}:00`);
        const durationMinutes = this.core.config.repair.durations[repairType] || 45;
        const end = new Date(start.getTime() + durationMinutes * 60000);
        return end.toISOString().replace('T', ' ').substring(0, 19);
    }

    generateAppointmentDescription() {
        const comments = document.getElementById('customerComments').value.trim();

        let description = `🔧 RÉPARATION ${this.core.userSelections.repair.toUpperCase()}\n\n`;
        description += `📱 Appareil: ${this.core.userSelections.brand} ${this.core.userSelections.series} ${this.core.userSelections.model}\n`;
        description += `⭐ Qualité pièce: ${this.core.userSelections.quality}\n`;
        description += `💰 Prix estimé: ${this.core.elements.priceMain.textContent}\n`;
        description += `⏱️ Durée estimée: ${this.core.elements.timeEstimate.textContent}\n\n`;
        description += `👤 Client: ${this.currentUser.name}`;
        if (this.currentUser.partner_id) {
            description += ` (ID: ${this.currentUser.partner_id})`;
        }
        description += `\n📧 Email: ${this.currentUser.email || 'Non renseigné'}`;
        description += `\n📞 Téléphone: ${document.getElementById('customerPhone').value || this.currentUser.phone || 'Non renseigné'}`;

        if (comments) {
            description += `\n\n💬 Commentaires client:\n${comments}`;
        }

        description += `\n\n📋 Rendez-vous créé via le configurateur web`;
        description += `\n🕐 Demande créée le: ${new Date().toLocaleString('fr-FR')}`;

        return description;
    }

    getRepairCategoryId(repairType) {
        return this.core.config.repair.categories[repairType] || [1];
    }

    async createOdooAppointment(appointmentData) {
        try {
            // Méthode 1: Via l'API JSON-RPC d'Odoo
            const response = await fetch(`${this.core.config.odoo.serverUrl}/web/dataset/call_kw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'call',
                    params: {
                        model: 'calendar.event',
                        method: 'create',
                        args: [appointmentData],
                        kwargs: {}
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.result) {
                    return true;
                }
            } else if (response.status === 401) {
                this.currentUser = null;
                this.core.currentUser = null;
                alert(this.core.texts.errors.sessionExpired);
                await this.checkAuthenticationAndShowForm();
                return false;
            }

            // Méthode 2: Endpoint personnalisé
            const customResponse = await fetch(`${this.core.config.odoo.serverUrl}/appointment/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(appointmentData)
            });

            if (customResponse.ok) {
                const result = await customResponse.json();
                return result.success || true;
            }

            return false;

        } catch (error) {
            console.error('Erreur API Odoo:', error);
            return await this.sendAppointmentByEmail(appointmentData);
        }
    }

    async sendAppointmentByEmail(appointmentData) {
        const subject = `Nouveau RDV Réparation - ${appointmentData.partner_name}`;
        const body = appointmentData.description.replace(/\n/g, '%0D%0A');

        window.location.href = `mailto:${this.core.config.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        return true;
    }

    showSuccessMessage() {
        const appointmentForm = document.getElementById('appointmentForm');

        appointmentForm.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #28a745;">
                <div style="font-size: 4rem; margin-bottom: 16px;">${this.core.texts.appointment.success.icon}</div>
                <h3 style="color: #28a745; margin-bottom: 16px;">${this.core.texts.appointment.success.title}</h3>
                <p style="margin-bottom: 24px; color: #6c757d;">
                    ${this.core.texts.appointment.success.message}
                </p>
                <button class="btn btn-success" onclick="configurator.core.resetForm()" style="margin-right: 12px;">
                    ${this.core.texts.buttons.newRepair}
                </button>
                <button class="btn btn-secondary" onclick="window.print()">
                    ${this.core.texts.buttons.print}
                </button>
            </div>
        `;
    }

    hideAppointmentForm() {
        const appointmentForm = document.getElementById('appointmentForm');
        const contactBtn = this.core.elements.contactBtn;

        appointmentForm.style.display = 'none';
        contactBtn.style.display = 'inline-block';

        // Réinitialiser le formulaire
        document.getElementById('customerName').value = '';
        document.getElementById('customerEmail').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('appointmentDate').value = '';
        document.getElementById('appointmentTime').value = '';
        document.getElementById('customerComments').value = '';
    }

    // ===== GESTION DE LA CONNEXION =====
    
    showLoginSection() {
        const loginSection = document.getElementById('loginSection');
        const contactBtn = this.core.elements.contactBtn;

        contactBtn.style.display = 'none';
        loginSection.style.display = 'block';
    }

    hideLoginSection() {
        const loginSection = document.getElementById('loginSection');
        const contactBtn = this.core.elements.contactBtn;

        loginSection.style.display = 'none';
        contactBtn.style.display = 'inline-block';
    }

    redirectToLogin() {
        this.saveFormState();
        const currentUrl = window.location.href.split('?')[0];
        const returnUrl = encodeURIComponent(currentUrl + '?restored=true');
        window.location.href = `${this.core.config.odoo.loginUrl}?redirect=${returnUrl}`;
    }

    redirectToRegister() {
        this.saveFormState();
        const currentUrl = window.location.href.split('?')[0];
        const returnUrl = encodeURIComponent(currentUrl + '?restored=true');
        window.location.href = `${this.core.config.odoo.registerUrl}?redirect=${returnUrl}`;
    }

    redirectToPortal() {
        this.saveFormState();
        window.location.href = this.core.config.odoo.portalUrl;
    }

    logout() {
        this.currentUser = null;
        this.core.currentUser = null;
        this.hideUserInfo();
        this.hideAppointmentForm();

        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${this.core.config.odoo.logoutUrl}?redirect=${returnUrl}`;
    }

    // ===== GESTION DE L'ÉTAT =====
    
    saveFormState() {
        const formState = {
            userSelections: this.core.userSelections,
            currentStep: this.core.currentStep,
            priceDisplayed: this.core.elements.priceResult.style.display === 'block',
            priceText: this.core.elements.priceMain.textContent,
            timestamp: Date.now()
        };
        localStorage.setItem(this.core.config.storage.formStateKey, JSON.stringify(formState));
    }

    restoreFormState() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const isRestored = urlParams.get('restored');

            if (isRestored) {
                const savedState = localStorage.getItem(this.core.config.storage.formStateKey);
                if (savedState) {
                    const formState = JSON.parse(savedState);

                    // Vérifier que l'état n'est pas trop ancien
                    if (Date.now() - formState.timestamp <= this.core.config.validation.sessionTimeout) {
                        this.core.userSelections = formState.userSelections;
                        this.core.currentStep = formState.currentStep;

                        // Restaurer les sélections visuelles
                        this.restoreVisualSelections();

                        // Restaurer l'affichage si un prix était affiché
                        if (formState.priceDisplayed) {
                            this.core.elements.priceMain.textContent = formState.priceText;
                            this.core.calculatePrice();
                        }

                        this.core.updateSummary();
                        this.core.showStep(this.core.currentStep);
                        this.core.updateProgress();
                    }

                    localStorage.removeItem(this.core.config.storage.formStateKey);
                }

                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('Erreur lors de la restauration:', error);
        }
    }

    restoreVisualSelections() {
        // Restaurer les boutons sélectionnés
        Object.keys(this.core.userSelections).forEach(type => {
            this.updateButtonSelections(type, this.core.userSelections[type]);
        });

        // Repeupler les options dynamiques si nécessaire
        if (this.core.userSelections.brand) {
            this.core.populateSeries(this.core.userSelections.brand);
            if (this.core.userSelections.series) {
                this.core.populateModels(this.core.userSelections.brand, this.core.userSelections.series);
            }
        }
    }

    updateButtonSelections(type, value) {
        let container;
        switch(type) {
            case 'repair':
                container = document.getElementById('repairOptions');
                break;
            case 'quality':
                container = document.getElementById('qualityOptions');
                break;
            case 'brand':
                container = this.core.elements.brandOptions;
                break;
            case 'series':
                container = this.core.elements.seriesOptions;
                break;
            case 'model':
                container = this.core.elements.modelOptions;
                break;
        }

        if (container) {
            container.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.getAttribute('data-value') === value) {
                    btn.classList.add('selected');
                }
            });
        }
    }

    // ===== INTÉGRATION AVEC LA PAGE APPOINTMENT =====
    
    static injectConfiguratorDataIntoAppointment() {
        try {
            let savedData = localStorage.getItem('latelier_appointment_data') ||
                           sessionStorage.getItem('latelier_appointment_data');

            if (!savedData) {
                console.log('ℹ️ Aucune donnée configurateur trouvée');
                return false;
            }

            const data = JSON.parse(savedData);

            // Vérifier expiration
            if (data.expires && new Date() > new Date(data.expires)) {
                console.log('⏰ Données configurateur expirées');
                localStorage.removeItem('latelier_appointment_data');
                sessionStorage.removeItem('latelier_appointment_data');
                return false;
            }

            console.log('🔍 Données du configurateur trouvées:', data);

            // Pré-sélectionner les champs
            OdooIntegration.preselectAppointmentFields(data);

            // Ajouter informations cachées
            OdooIntegration.addHiddenAppointmentInfo(data);

            // Modifier le titre
            OdooIntegration.updateAppointmentTitle(data);

            // Afficher confirmation
            OdooIntegration.showConfiguratorConfirmation(data);

            // Nettoyer après délai
            setTimeout(() => {
                localStorage.removeItem('latelier_appointment_data');
                sessionStorage.removeItem('latelier_appointment_data');
            }, 300000);

            console.log('✅ Injection des données terminée avec succès');
            return true;

        } catch (error) {
            console.error('❌ Erreur lors de l\'injection des données:', error);
            return false;
        }
    }

    static preselectAppointmentFields(data) {
        const mappings = {
            brand: { 'Apple': '1', 'Samsung': '2', 'Xiaomi': '3', 'Redmi': '4', 'Huawei': '8', 'Oppo': '5', 'Poco': '6', 'Realme': '7', 'OnePlus': '9' },
            repair: { 'Écran': '10', 'Batterie': '11', 'Châssis': '12' },
            quality: { 'Compatible': '13', 'Origine': '14' }
        };

        // Marque
        const brandSelect = document.querySelector('select[name="question_1"]');
        if (brandSelect && data.userSelections.brand) {
            const brandValue = mappings.brand[data.userSelections.brand];
            if (brandValue) {
                brandSelect.value = brandValue;
                brandSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Type de réparation
        const repairSelect = document.querySelector('select[name="question_2"]');
        if (repairSelect && data.userSelections.repair) {
            const repairValue = mappings.repair[data.userSelections.repair];
            if (repairValue) {
                repairSelect.value = repairValue;
                repairSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Qualité
        const qualitySelect = document.querySelector('select[name="question_3"]');
        if (qualitySelect && data.userSelections.quality) {
            const qualityValue = mappings.quality[data.userSelections.quality];
            if (qualityValue) {
                qualitySelect.value = qualityValue;
                qualitySelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    static addHiddenAppointmentInfo(data) {
        let existingField = document.querySelector('input[name="configurator_info"]');
        if (!existingField) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = 'configurator_info';
            hiddenField.value = JSON.stringify({
                device: `${data.userSelections.brand} ${data.userSelections.series} ${data.userSelections.model}`,
                repair: data.userSelections.repair,
                quality: data.userSelections.quality,
                price: data.priceInfo.price,
                duration: data.priceInfo.duration,
                timestamp: data.timestamp
            });

            const form = document.querySelector('.appointment_submit_form, form');
            if (form) {
                form.appendChild(hiddenField);
            }
        }
    }

    static updateAppointmentTitle(data) {
        const titleElement = document.querySelector('h4 span');
        if (titleElement && titleElement.textContent.includes('Ajoutez plus de détails')) {
            titleElement.innerHTML = `Rendez-vous pour réparation ${data.userSelections.repair}<br><small class="text-muted">${data.userSelections.brand} ${data.userSelections.series} ${data.userSelections.model} - ${data.priceInfo.price}</small>`;
        }
    }

    static showConfiguratorConfirmation(data) {
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #28a745; color: white; padding: 12px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px; max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">✅</span>
                <div>
                    <strong>Configuration récupérée !</strong><br>
                    <small>${data.userSelections.brand} ${data.userSelections.model} - ${data.userSelections.repair}</small>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        setTimeout(() => {
            banner.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => banner.remove(), 300);
        }, 5000);
    }

    // ===== INITIALISATION DE L'INTÉGRATION =====
    
    static initConfiguratorIntegration() {
        const isCalendarPage = window.location.pathname === '/appointment/1' &&
                              document.querySelector('.o_appointment_calendar');
        const isFormPage = window.location.pathname.includes('/appointment/1/info') &&
                          document.querySelector('select[name="question_1"]');

        if (isCalendarPage) {
            console.log('📅 Page sélection horaire détectée');
            OdooIntegration.showConfiguratorCalendarNotification();
        } else if (isFormPage) {
            console.log('📋 Page formulaire détails détectée');
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(OdooIntegration.injectConfiguratorDataIntoAppointment, 500);
                });
            } else {
                setTimeout(OdooIntegration.injectConfiguratorDataIntoAppointment, 500);
            }
        }
    }

    static showConfiguratorCalendarNotification() {
        const savedData = localStorage.getItem('latelier_appointment_data') ||
                         sessionStorage.getItem('latelier_appointment_data');

        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);

            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white; padding: 16px 20px; border-radius: 12px;
                box-shadow: 0 6px 20px rgba(0,123,255,0.3);
                font-size: 14px; max-width: 320px;
                animation: slideInRight 0.4s ease-out;
            `;

            banner.innerHTML = `
                <div style="display: flex; align-items: start; gap: 12px;">
                    <span style="font-size: 20px;">🔧</span>
                    <div>
                        <strong style="font-size: 15px;">Réparation configurée</strong><br>
                        <div style="font-size: 13px; opacity: 0.9; margin: 4px 0;">
                            ${data.userSelections.brand} ${data.userSelections.model}<br>
                            ${data.userSelections.repair} - ${data.priceInfo.price}
                        </div>
                        <small style="font-size: 12px; opacity: 0.8;">
                            ✅ Sélectionnez votre créneau ci-dessous
                        </small>
                    </div>
                </div>
            `;

            document.body.appendChild(banner);

            setTimeout(() => {
                banner.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => banner.remove(), 300);
            }, 8000);

        } catch (error) {
            console.error('Erreur notification calendrier:', error);
        }
    }

    // ===== UTILITAIRES =====
    
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
}

// Initialiser l'intégration dès que possible
OdooIntegration.initConfiguratorIntegration();

// Export pour utilisation
window.OdooIntegration = OdooIntegration;
