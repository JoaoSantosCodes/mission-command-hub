/** a11y: foco no main após activação (navegação por teclado). */
export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#conteudo-principal"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById('conteudo-principal')?.focus();
      }}
    >
      Saltar para o conteúdo
    </a>
  );
}
