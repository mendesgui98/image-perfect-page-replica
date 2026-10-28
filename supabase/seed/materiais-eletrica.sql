-- Materiais elétricos de quadro (11 itens) — carga inicial do catálogo.
-- Uso: bun run stack:seed supabase/seed/materiais-eletrica.sql
-- Idempotente: itens com o mesmo nome já cadastrados são ignorados.
-- Preço fica 0: preencha o valor de compra na tela Materiais antes de orçar.
-- Especificações conferidas em fichas de fabricantes em 26/10/2026 (fontes no fim do arquivo).

INSERT INTO public.materials (name, reference, specs, purchase_unit, consumption_unit, conversion, price)
SELECT v.name, v.reference, v.specs, v.purchase_unit, v.consumption_unit, v.conversion, 0
FROM (VALUES
  (
    'Bloco de distribuição tetrapolar 125 A',
    'nVent ERIFLEX TR-125A (art. 563150) ou equivalente',
    $s$4 polos; corrente nominal 125 A; tensão de isolamento Ui 1000 V.
Por polo: 1 entrada (M6) e 5 saídas (M5), parafusos inclusos.
Corrente de pico Ipk 40 kA; suportabilidade Icw 8,4 kA por 1 s.
Barras de cobre; invólucro em poliamida com fibra de vidro, UL94 V-0, tampa transparente.
Fixação em trilho DIN 35 mm ou por parafusos. Aprox. 150 x 126 x 117 mm, 0,69 kg.
Normas: IEC 61439-1, IEC 60695-2-11 (fio incandescente 960 °C), RoHS.$s$,
    'un', 'un', 1
  ),
  (
    'DPS classe II 175 V 45 kA',
    'Clamper Front 175V 45kA (cód. 014294; versão /SR com sinalização remota) ou equivalente',
    $s$Classe II (IEC 61643-11). Uc 175 Vca; In 20 kA e Imax 45 kA (8/20 µs); Up 1,2 kV.
Varistor (MOV) com desligador térmico e indicação verde/vermelho de fim de vida; resposta < 25 ns.
Fusível de retaguarda 100 A gL/gG; condutores de 4 a 25 mm²; torque máx. 3 N·m.
Trilho DIN 35 mm; 94,6 x 74 x 17,5 mm (1 módulo); IP20; -40 a +70 °C.
Normas: IEC 61643-11, UL 1449, ABNT NBR 5410.
Atenção: 175 V para redes 127/220 V; em 220/380 V usar Uc 275 V.$s$,
    'un', 'un', 1
  ),
  (
    'Abraçadeira de nylon 200 x 4,6 mm',
    'HellermannTyton T50R ou equivalente',
    $s$Poliamida 6.6. Comprimento 200 mm; largura 4,6 mm.
Diâmetro máximo de amarração 50 mm; resistência à tração 225 N.
Temperatura de uso -40 a +85 °C; UL94 V-2. Pacote com 100 unidades.$s$,
    'pacote 100 un', 'un', 100
  ),
  (
    'Barramento pente bipolar 63 A (1 m)',
    'Hager KDN263B ou equivalente',
    $s$2 polos; 63 A; Ue 230-400 V; Uimp 4,5 kV.
1000 mm com 56 módulos (corta-se no tamanho do quadro); conexão tipo forquilha.
Para condutor/borne de 10 mm²; compatível com disjuntores de borne a parafuso.
Usar tampas laterais nas extremidades cortadas.$s$,
    'un', 'un', 1
  ),
  (
    'Barramento pente unipolar 63 A (1 m)',
    'Hager KDN163B ou equivalente',
    $s$1 polo; 63 A; Ue 415 V; Uimp 4,5 kV.
1000 mm com 57 módulos (corta-se no tamanho do quadro); conexão tipo forquilha.
Para condutor/borne de 10 mm²; compatível com disjuntores de borne a parafuso.
Usar tampas laterais nas extremidades cortadas.$s$,
    'un', 'un', 1
  ),
  (
    'Terminal de alimentação lateral para barramento pente, até 25 mm²',
    'Hager KF83B ou equivalente',
    $s$Borne de alimentação lateral para barramento pente; 100 A.
Até 2 condutores rígidos de 25 mm²; ligação por parafuso; torque 3 N·m.
Livre de halogênio; RoHS.$s$,
    'un', 'un', 1
  ),
  (
    'Terminal de alimentação superior para barramento pente, até 25 mm²',
    'Hager KF81D ou equivalente',
    $s$Borne de alimentação superior (forquilha) para barramento pente; 80 A.
Condutor de até 25 mm² rígido ou 16 mm² flexível; ligação por parafuso.$s$,
    'un', 'un', 1
  ),
  (
    'Terminal ilhós tubular 1,5 mm²',
    'Phoenix Contact AI 1,5-8 RD ou equivalente',
    $s$Para cabo flexível de até 1,5 mm² (AWG 16). Tubo de 8 mm.
Cobre eletrolítico estanhado; colar isolante em polipropileno vermelho.
Norma DIN 46228-4. Crimpar com alicate próprio para ilhós.$s$,
    'pacote 100 un', 'un', 100
  ),
  (
    'Terminal ilhós tubular 2,5 mm²',
    'Phoenix Contact AI 2,5-8 BU (3200920) ou equivalente',
    $s$Para cabo flexível de até 2,5 mm² (AWG 14). Tubo de 8 mm; diâmetro 2,3 mm.
Cobre eletrolítico estanhado; colar isolante em polipropileno azul.
Normas DIN 46228-4 e UL 486F. Crimpar com alicate próprio para ilhós.$s$,
    'pacote 100 un', 'un', 100
  ),
  (
    'Terminal ilhós tubular 4 mm²',
    'Phoenix Contact AI 4-10 GY (3200535) ou equivalente',
    $s$Para cabo flexível de até 4 mm² (AWG 12). Tubo de 10 mm; comprimento total 17 mm.
Cobre eletrolítico estanhado; colar isolante em polipropileno cinza.
Norma DIN 46228-4. Crimpar com alicate próprio para ilhós.$s$,
    'pacote 100 un', 'un', 100
  ),
  (
    'Terminal ilhós tubular 6 mm²',
    'Phoenix Contact AI 6-12 YE ou equivalente',
    $s$Para cabo flexível de até 6 mm² (AWG 10). Tubo de 12 mm; comprimento total 20 mm; diâmetro 3,5 mm.
Cobre eletrolítico estanhado; colar isolante em polipropileno amarelo.
Normas DIN 46228-4 e UL 486F. Crimpar com alicate próprio para ilhós.$s$,
    'pacote 100 un', 'un', 100
  )
) AS v(name, reference, specs, purchase_unit, consumption_unit, conversion)
WHERE NOT EXISTS (
  SELECT 1 FROM public.materials m WHERE lower(m.name) = lower(v.name)
);

-- Fontes:
-- Bloco: https://origin-nvent.nvent.com/en-us/data-solutions/products/tr-four-pole-distribution-block-125/pdf
-- DPS: https://clamper.com.br/wp-content/uploads/2023/01/ft_CLAMPER-Front.pdf
-- Abraçadeira: https://au.rs-online.com/web/p/cable-ties/1705289
-- Pente bipolar: https://hager.com/pt/catalogo/produto/kdn263b-pente-de-lig-2p-63a-forq-10mm2-57m
-- Pente unipolar: https://hager.com/pt/catalogo/produto/kdn163b-pente-de-lig-1p-63a-forq-10mm2-57m
-- Terminal lateral: https://hager.com/pt/catalogo/produto/kf83b-borne-de-ligacao-2x25mm2-lateral-pont
-- Terminal superior: https://hager.com/my/catalogue/products/kf81d-connection-terminal-fork-25mm2
-- Ilhós 2,5: https://www.phoenixcontact.com/us/products/3200920/pdf
-- Ilhós 4: https://onlinecomponents.com/fr/phoenix-contact/ai410gy-49668211.html
-- Ilhós 6: https://uk.rs-online.com/web/p/bootlace-ferrules/0557816
