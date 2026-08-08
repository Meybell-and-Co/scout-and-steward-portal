<?php
/**
 * Component: Callout
 * Meaning: Spotlight (importance, focus)
 * // Visual Language: Spotlight
 */

$mnco_title = $args['title'] ?? '';
$mnco_body = $args['body'] ?? '';
?>

<section class="mnco-callout">
  <div class="mnco-callout__inner">
    
    <?php if ($mnco_title): ?>
      <h3 class="mnco-callout__title">
        <?php echo esc_html($mnco_title); ?>
      </h3>
    <?php endif; ?>

    <?php if ($mnco_body): ?>
      <p class="mnco-callout__body">
        <?php echo esc_html($mnco_body); ?>
      </p>
    <?php endif; ?>

  </div>
</section>