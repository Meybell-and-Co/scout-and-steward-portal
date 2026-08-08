# The Meybell Framework

## First Edition

------------------------------------------------------------------------

*Practical guidance for building durable digital systems.*

> "Good architecture should make the right thing easier than the wrong
> thing."

The purpose of this document is not to prescribe every implementation
detail.

It exists to preserve the reasoning behind the Meybell Framework so
future decisions remain consistent even as technologies change.

When implementation and philosophy disagree, revisit the implementation
first. Revise the philosophy only when a better principle has emerged.

------------------------------------------------------------------------

## Purpose

The Meybell Framework is a WordPress-first, design-system-driven starter
framework for building maintainable, accessible, secure, and
understandable digital experiences.

It is not intended to replace WordPress.

It exists to organize and extend platforms using documented APIs,
conventions, and a platform-independent design language.

------------------------------------------------------------------------

## Contents

-   Guiding Principles
-   Repository Structure
-   Generated Artifacts
-   Architecture Decision Records

------------------------------------------------------------------------

# Guiding Principles

## Respect the Platform

Build with the platform before building around it.

## Presentation and Functionality are Separate

Themes present.

Plugins provide functionality.

## One Source of Truth

Every piece of information has one authoritative owner.

Generated artifacts never become authoritative sources.

## Clear Before Clever

Optimize for comprehension before optimization.

## Build Small Pieces

Small files. Small functions. Small commits.

## Progressive Enhancement

Content should remain useful without JavaScript.

## Accessibility is a Feature

Accessibility is part of design---not an afterthought.

## Security by Default

Validate. Sanitize. Authorize. Escape.

## Documentation Matters

Every significant decision deserves an explanation.

## Systems Before Solutions

Build the smallest system that makes tomorrow's work easier.

## Intentional Complexity

Complexity is acceptable only when it creates lasting value.

## Optimize for Ownership

Build systems organizations can confidently own for years.

## Human-Centered Engineering

Optimize for human understanding before machine cleverness whenever
practical.

------------------------------------------------------------------------

# Repository Structure

`assets/`
:   Visual assets.

`config/`
:   Platform-specific configuration.

`docs/`
:   Framework documentation.

`inc/`
:   Theme implementation.

`scripts/`
:   Build and verification tooling.

`template-parts/`
:   Reusable templates.

`templates/`
:   Page templates.

`design-tokens.json`
:   Canonical design language.

`theme.json`
:   Generated WordPress implementation.

------------------------------------------------------------------------

# Generated Artifacts

## Source Files

-   design-tokens.json
-   config/theme.base.json

## Generated Files

-   theme.json

Generated files are products of the build process and should be
regenerated rather than edited manually.

-----------------------------------------------------------------------