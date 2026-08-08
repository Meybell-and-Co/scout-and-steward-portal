<?php
/**
 * Component: Bridge
 * Meaning: Connection / Relationship
 */

$mnco_left = $args['left'] ?? '';
$mnco_right = $args['right'] ?? '';
?>

<section class="mnco-bridge">
  <div class="mnco-bridge__inner">

    <div class="mnco-bridge__left">
      <?php echo esc_html($mnco_left); ?>
    </div>

    <div class="mnco-bridge__connector">
      →
    </div>

    <div class="mnco-bridge__right">
      <?php echo esc_html($mnco_right); ?>
    </div>

  </div>
</section>