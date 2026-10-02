<template>
  <div>
    <!--
      Radice singola: con una radice a frammento la transizione di pagina in
      modalita out-in non riesce a scambiare il componente e la rotta cambia
      senza che il contenuto si aggiorni.
    -->
    <NuxtLoadingIndicator color="var(--color-brand-red)" />
    <UiVrsusPullToRefresh />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
