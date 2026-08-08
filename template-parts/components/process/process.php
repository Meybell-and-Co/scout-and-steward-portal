<?php
/**
 * Component: Process
 * Meaning: Queue (sequence, order)
 */

$mnco_steps = $args['steps'] ?? [];
?>

<section class="mnco-process">
  <ol class="mnco-process__list">

    <?php foreach ($mnco_steps as $step): ?>
      <li class="mnco-process__item">
        <?php echo esc_html($step); ?>
      </li>
    <?php endforeach; ?>

  </ol>
</section>