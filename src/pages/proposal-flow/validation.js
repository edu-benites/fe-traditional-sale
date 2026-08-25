export function isValidCpf(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (length) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

export function isValidCnpj(value) {
  const characters = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (characters.length !== 14 || /^(.)\1{13}$/.test(characters)) return false;

  const calculateDigit = (weights) => {
    const sum = weights.reduce(
      (total, weight, index) => total + (characters.charCodeAt(index) - 48) * weight,
      0
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    calculateDigit([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(characters[12]) &&
    calculateDigit([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3]) === Number(characters[13])
  );
}

export function getMissingRegistrationFields(clientType, formData) {
  const requiredFields =
    clientType === "juridica"
      ? [
          ["nomeFantasia", "Nome fantasia"], ["razaoSocial", "Razão social"],
          ["faturamentoMensal", "Faturamento mensal"], ["ramoAtividade", "Ramo de atividade"],
          ["cep", "CEP"], ["endereco", "Endereço"], ["numero", "Número"],
          ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"],
          ["representanteNome", "Nome do representante"], ["representanteEmail", "E-mail do representante"],
          ["celular1", "Celular 1"],
        ]
      : [
          ["nomeCompleto", "Nome completo"], ["pronomePreferencia", "Pronome de preferência"],
          ["sexo", "Sexo"], ["dataNascimento", "Data de nascimento"], ["estadoCivil", "Estado civil"],
          ["nacionalidade", "Nacionalidade"], ["email", "E-mail"], ["celular1", "Celular 1"],
          ["cep", "CEP"], ["endereco", "Endereço"], ["numero", "Número"], ["bairro", "Bairro"],
          ["cidade", "Cidade"], ["uf", "UF"], ["profissao", "Profissão"],
        ];

  if (clientType === "fisica" && !formData.naoInformarRg) {
    requiredFields.splice(4, 0, ["rg", "RG"], ["orgaoExpedidor", "Órgão expedidor"], ["dataExpedicao", "Data de expedição"]);
  }

  return requiredFields
    .filter(([field]) => !String(formData[field] || "").trim())
    .map(([field, label]) => ({ field, label }));
}

export function getBankValue(bank) {
  return `${bank.id} - ${bank.description || bank.name || ""}`;
}
