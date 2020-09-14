var APP = (() => {
    var _init = () => {
        _bindEvents();
    };
    var _bindEvents = () => {
        $('#form_shorten').on('submit', (e) => {
            e.preventDefault();
            var url = $.trim($('.text-url').val());
            $.ajax({
                url: '/shorten',
                type: 'POST',
                data: {
                    url: url
                },
                success: (data) => {
                    var _buildUrl = window.location.origin + '/' + data.hash;
                    $('.shortened-url').html('<a href="' + _buildUrl + '" target="_blank">' + _buildUrl + '</a>');
                    $('#shorten_area').removeClass('hide').show();
                }
            })
        });
    };
    return {
        init: _init
    };
})();

$(() => {
    APP.init();
});
