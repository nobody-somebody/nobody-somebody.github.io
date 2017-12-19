/**
 * Created by l on 10.05.2017.
 */
$(document).ready(function() {
    $('#list').click(function() {
        console.log("list");

        $('#ulist').slideToggle(500);

    });//end slide toggle

    $(window).resize(function() {
        if (  $(window).width() > 766 ) {
            $('#ulist').removeAttr('style');
        }
    });//end resize
});//end ready