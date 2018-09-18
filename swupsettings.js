let options = {
    LINK_SELECTOR: 'a[href^="/"]:not([data-no-swup]), a[href^="#"]:not([data-no-swup]), a[xlink\\:href]',
    FORM_SELECTOR: 'form[data-swup-form]',
    elements: [
        '#swup'
    ],
    animationSelector: '[class^="a-"]',
    cache: true,
    pageClassPrefix: '',
    scroll: true,
    debugMode: false,
    preload: true,
    support: true,
    disableIE: false,
    skipPopStateHandling: function(event){
        if (event.state && event.state.source == "swup") {
            return false;
        }
        return true;
    },
};
var swup = new Swup(options);