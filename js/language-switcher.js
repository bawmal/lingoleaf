// Language switching functionality for LingoLeaf
class LanguageSwitcher {
    constructor() {
        this.currentLang = localStorage.getItem('lingoleaf-language') || 'en';
        this.translations = window.translations;
        this.init();
    }

    init() {
        // Set initial language
        this.setLanguage(this.currentLang, false);
        
        // Add language switcher to navigation
        this.addLanguageSwitcher();
        
        // Add language switcher to PlantSona page
        this.addPlantSonaLanguageSwitcher();
        
        // Add language switcher to other pages
        this.addOtherPagesLanguageSwitcher();
    }

    addLanguageSwitcher() {
        // Try multiple selectors to find the navigation
        const nav = document.querySelector('nav .hidden.md\\:flex.items-center.space-x-8') ||
                    document.querySelector('.hidden.md\\:flex.items-center.space-x-8');
        
        if (nav) {
            const switcher = document.createElement('div');
            switcher.className = 'relative ml-4';
            switcher.innerHTML = `
                <button id="languageToggle" class="flex items-center space-x-1 text-forest hover:text-sage transition-colors font-medium min-h-[44px]">
                    <span>🌐</span>
                    <span id="currentLangText">${this.currentLang === 'fr' ? 'FR' : 'EN'}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="languageDropdown" class="absolute right-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-sage/20 hidden z-50">
                    <button onclick="languageSwitcher.setLanguage('en')" class="w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors ${this.currentLang === 'en' ? 'bg-sage/10 font-semibold' : ''}">
                        🇺🇸 EN
                    </button>
                    <button onclick="languageSwitcher.setLanguage('fr')" class="w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors ${this.currentLang === 'fr' ? 'bg-sage/10 font-semibold' : ''}">
                        🇫🇷 FR
                    </button>
                </div>
            `;
            
            nav.appendChild(switcher);
            
            // Add dropdown toggle functionality
            const toggle = document.getElementById('languageToggle');
            const dropdown = document.getElementById('languageDropdown');
            
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }
    }

    addPlantSonaLanguageSwitcher() {
        // For PlantSona page header
        const plantsonaHeader = document.querySelector('header .container.mx-auto .flex.items-center.justify-between');
        if (plantsonaHeader) {
            const switcher = document.createElement('div');
            switcher.className = 'relative';
            switcher.innerHTML = `
                <button id="plantsonaLanguageToggle" class="flex items-center space-x-1 text-white hover:text-green-200 transition font-medium">
                    <span>🌐</span>
                    <span>${this.currentLang === 'fr' ? 'FR' : 'EN'}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="plantsonaLanguageDropdown" class="absolute right-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-green-600/20 hidden z-50">
                    <button onclick="languageSwitcher.setLanguage('en')" class="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors ${this.currentLang === 'en' ? 'bg-green-50 font-semibold text-green-800' : ''}">
                        🇺🇸 EN
                    </button>
                    <button onclick="languageSwitcher.setLanguage('fr')" class="w-full text-left px-4 py-2 text-sm hover:bg-green-50 transition-colors ${this.currentLang === 'fr' ? 'bg-green-50 font-semibold text-green-800' : ''}">
                        🇫🇷 FR
                    </button>
                </div>
            `;
            
            plantsonaHeader.appendChild(switcher);
            
            // Add dropdown toggle functionality
            const toggle = document.getElementById('plantsonaLanguageToggle');
            const dropdown = document.getElementById('plantsonaLanguageDropdown');
            
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }
    }

    addOtherPagesLanguageSwitcher() {
        // For success page and other pages
        const headers = document.querySelectorAll('header .container .flex.items-center.justify-between, .max-w-2xl.mx-auto .flex.items-center.justify-between');
        headers.forEach(header => {
            if (!header.querySelector('#languageToggle') && !header.querySelector('#plantsonaLanguageToggle')) {
                const switcher = document.createElement('div');
                switcher.className = 'relative';
                switcher.innerHTML = `
                    <button class="language-toggle flex items-center space-x-1 text-forest hover:text-sage transition-colors font-medium">
                        <span>🌐</span>
                        <span>${this.currentLang === 'fr' ? 'FR' : 'EN'}</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div class="language-dropdown absolute right-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-sage/20 hidden z-50">
                        <button onclick="languageSwitcher.setLanguage('en')" class="w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors ${this.currentLang === 'en' ? 'bg-sage/10 font-semibold' : ''}">
                            🇺🇸 EN
                        </button>
                        <button onclick="languageSwitcher.setLanguage('fr')" class="w-full text-left px-4 py-2 text-sm hover:bg-sage/10 transition-colors ${this.currentLang === 'fr' ? 'bg-sage/10 font-semibold' : ''}">
                            🇫🇷 FR
                        </button>
                    </div>
                `;
                
                header.appendChild(switcher);
                
                // Add dropdown toggle functionality
                const toggle = switcher.querySelector('.language-toggle');
                const dropdown = switcher.querySelector('.language-dropdown');
                
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('hidden');
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    dropdown.classList.add('hidden');
                });
            }
        });
    }

    setLanguage(lang, save = true) {
        if (save) {
            localStorage.setItem('lingoleaf-language', lang);
        }
        this.currentLang = lang;
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Update all translatable elements
        this.updatePage();
        
        // Update language switcher UI
        this.updateLanguageSwitcher();
    }

    updatePage() {
        const texts = this.translations[this.currentLang];
        
        // First, update all elements with data-translate attribute
        this.updateDataTranslateElements();
        
        // Update navigation
        this.updateText('nav a[href="#features"]', texts.nav.features);
        this.updateText('nav a[href="#personalities"]', texts.nav.personalities);
        this.updateText('nav a[href="#signup"]', texts.nav.get_started);
        this.updateText('nav a[href="/plantsona.html"] span:last-child', texts.nav.plantsona);
        
        // Update hero section
        this.updateHTML('h1.text-4xl', texts.hero.title);
        this.updateText('h2.text-xl\\/text-2xl\\/text-3xl', texts.hero.subtitle);
        this.updateHTML('p.text-lg\\/text-xl', texts.hero.description);
        this.updateText('.inline-flex.items-center span', texts.hero.free_beta);
        
        // Update trust bar
        this.updateText('.flex.items-center.space-x-2 span:last-child', texts.trust.rating, 0);
        this.updateText('.flex.items-center.space-x-2 span:last-child', texts.trust.survival_rate, 1);
        this.updateText('.flex.items-center.space-x-2 span:last-child', texts.trust.works_any_phone, 2);
        
        // Update social proof
        this.updateText('.text-center.mb-12 h2', texts.social_proof.title);
        this.updateText('blockquote', texts.social_proof.testimonial1, 0);
        this.updateText('blockquote', texts.social_proof.testimonial2, 1);
        this.updateText('blockquote', texts.social_proof.testimonial3, 2);
        
        // Update problem section
        this.updateHTML('.text-center.mb-16 h2', texts.problem.title);
        this.updateText('h3.text-xl', texts.problem.problem1_title, 0);
        this.updateHTML('p.text-forest\\/70', texts.problem.problem1_text, 0);
        this.updateText('h3.text-xl', texts.problem.problem2_title, 1);
        this.updateHTML('p.text-forest\\/70', texts.problem.problem2_text, 1);
        this.updateText('h3.text-xl', texts.problem.problem3_title, 2);
        this.updateHTML('p.text-forest\\/70', texts.problem.problem3_text, 2);
        
        // Update features section
        this.updateText('#features .text-center.mb-16 h2', texts.features.title);
        this.updateText('h3.text-2xl', texts.features.feature1_title, 0);
        this.updateText('p.text-forest\\/70', texts.features.feature1_text, 0);
        this.updateText('h3.text-2xl', texts.features.feature2_title, 1);
        this.updateText('p.text-forest\\/70', texts.features.feature2_text, 1);
        this.updateText('h3.text-2xl', texts.features.feature3_title, 2);
        this.updateText('p.text-forest\\/70', texts.features.feature3_text, 2);
        
        // Update PlantSona section
        this.updateText('.text-4xl.lg\\:text-5xl', texts.plantsona.title, 0); // PlantSona section title
        this.updateText('p.text-xl', texts.plantsona.description, 0);
        this.updateText('h3.font-semibold', texts.plantsona.ai_identification, 0);
        this.updateText('p.text-gray-600', texts.plantsona.ai_identification_text, 0);
        this.updateText('h3.font-semibold', texts.plantsona.choose_personality, 1);
        this.updateText('p.text-gray-600', texts.plantsona.choose_personality_text, 1);
        this.updateText('h3.font-semibold', texts.plantsona.care_instructions, 2);
        this.updateText('p.text-gray-600', texts.plantsona.care_instructions_text, 2);
        this.updateText('a.inline-block', texts.plantsona.try_plantsona);
        
        // Update personalities section
        this.updateText('#personalities .text-center.mb-16 h2', texts.personalities.title);
        this.updateText('p.text-xl', texts.personalities.subtitle);
        this.updateText('h3.text-xl', texts.personalities.sassy_title, 0);
        this.updateText('p.text-sm', texts.personalities.sassy_quote, 0);
        this.updateText('span.inline-block', texts.personalities.most_popular, 0);
        
        // Update PlantSona page content
        this.updatePlantSonaPage();
        
        // Update success page content
        this.updateSuccessPage();
        
        // Update privacy policy content
        this.updatePrivacyPage();
    }

    updatePlantSonaPage() {
        const texts = this.translations[this.currentLang].plantsona_page;
        
        // Update PlantSona page specific content
        this.updateText('.text-center.mb-12 h2', texts.title);
        this.updateText('.text-center.mb-12 p', texts.description);
        this.updateText('h3.text-2xl', texts.step1_title, 0);
        this.updateText('p.text-sm', texts.click_upload);
        this.updateText('h3.text-2xl', texts.step2_title, 1);
        this.updateText('h3.text-2xl', texts.step3_title, 2);
    }

    updateSuccessPage() {
        const texts = this.translations[this.currentLang].success;
        
        // Update success page content
        this.updateText('.text-4xl.lg\\:text-5xl', texts.title);
        this.updateText('p.text-lg', texts.subtitle);
        this.updateText('span.text-forest', texts.registration_complete);
        this.updateText('h3.font-semibold', texts.check_phone, 0);
        this.updateText('p.text-forest\\/70', texts.check_phone_text, 0);
        this.updateHTML('p.text-sm', texts.tip, 0);
        this.updateText('h3.font-semibold', texts.check_email, 1);
        this.updateText('p.text-forest\\/70', texts.check_email_text, 1);
        this.updateText('h2.text-2xl', texts.have_more_plants);
        this.updateHTML('#morePlantsText', texts.more_plants_text);
        this.updateText('button', texts.add_another, 0);
        this.updateText('button', texts.done, 1);
    }

    updatePrivacyPage() {
        const texts = this.translations[this.currentLang].privacy;
        
        // Update privacy policy content
        this.updateText('.text-4xl.md\\:text-5xl', texts.title);
        this.updateText('p strong', texts.effective_date, 0);
        this.updateText('p strong', texts.last_updated, 1);
        this.updateText('.prose p', texts.introduction, 0);
        this.updateText('.prose p', texts.commitment, 1);
        this.updateText('.bg-forest h2', texts.accessibility_notice);
        this.updateText('.bg-forest p', texts.accessibility_text);
        this.updateText('section h2', texts.info_we_collect, 0);
        this.updateText('section p', texts.info_we_collect_text, 0);
        this.updateText('h3.text-xl', texts.account_data, 0);
        this.updateText('li', texts.account_data_text, 0);
        this.updateText('li strong', texts.plant_profile_data, 1);
        this.updateText('li', texts.plant_profile_data_text, 1);
    }

    updateText(selector, text, index = 0) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements[index] && text) {
                elements[index].textContent = text;
            }
        } catch (e) {
            // Selector not valid or element not found - skip silently
        }
    }

    updateHTML(selector, html, index = 0) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements[index] && html) {
                elements[index].innerHTML = html;
            }
        } catch (e) {
            // Selector not valid or element not found - skip silently
        }
    }

    updateDataTranslateElements() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const value = this.getNestedTranslation(key);
            if (value) {
                element.textContent = value;
            }
        });
    }

    getNestedTranslation(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return null;
            }
        }
        return typeof value === 'string' ? value : null;
    }

    updateLanguageSwitcher() {
        // Update main navigation switcher
        const currentLangText = document.getElementById('currentLangText');
        if (currentLangText) {
            currentLangText.textContent = this.currentLang === 'fr' ? 'FR' : 'EN';
        }
        
        // Update PlantSona switcher
        const plantsonaLangText = document.querySelector('#plantsonaLanguageToggle span:nth-child(2)');
        if (plantsonaLangText) {
            plantsonaLangText.textContent = this.currentLang === 'fr' ? 'FR' : 'EN';
        }
        
        // Update other page switchers
        const otherLangTexts = document.querySelectorAll('.language-toggle span:nth-child(2)');
        otherLangTexts.forEach(element => {
            element.textContent = this.currentLang === 'fr' ? 'FR' : 'EN';
        });
        
        // Update dropdown button states
        const dropdownButtons = document.querySelectorAll('#languageDropdown button, #plantsonaLanguageDropdown button, .language-dropdown button');
        dropdownButtons.forEach(button => {
            const isEnglish = button.textContent.includes('EN');
            const isSelected = (isEnglish && this.currentLang === 'en') || (!isEnglish && this.currentLang === 'fr');
            
            if (isSelected) {
                button.classList.add('bg-sage/10', 'font-semibold');
                if (button.closest('#plantsonaLanguageDropdown')) {
                    button.classList.add('bg-green-50', 'text-green-800');
                }
            } else {
                button.classList.remove('bg-sage/10', 'font-semibold', 'bg-green-50', 'text-green-800');
            }
        });
    }
}

// Initialize language switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.languageSwitcher = new LanguageSwitcher();
});
