<?php
/**
 * Template Name: Components Demo
 */

get_header();
?>

<main class="mnco-demo">

  <section class="mnco-demo__section">
    <h1>Components Demo</h1>

    <?php
    get_template_part(
      'template-parts/components/callout/callout',
      null,
      [
        'title' => 'This is important',
        'body' => 'This callout demonstrates the Spotlight visual language. It draws attention without shouting.'
      ]
    );
    ?>

  </section>

</main>

<?php get_footer(); ?>