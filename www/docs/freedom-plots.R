# Auswertung von docs/pimc-freedom.js (Freiheitsgrad, PIMC, Random-Baseline)
# Aufruf aus www/ heraus, z.B. in RStudio mit setwd(".../www") oder:
#   Rscript docs/freedom-plots.R [docs/results/freedom-....json]
# Benoetigt: install.packages(c("jsonlite", "ggplot2"))

library(jsonlite)
library(ggplot2)

args <- commandArgs(trailingOnly = TRUE)
file <- if (length(args) > 0) args[1] else "docs/results/freedom-2026-10-22T12-21-54.json"

# ---------------------------------------------------------------- Einlesen
raw <- fromJSON(file)
d <- raw$rows   # data.frame, je Lage eine Zeile

# rndScores (1000 Werte) und phaseStates (9 Werte) sind Listen-Spalten;
# daraus die benoetigten Kennzahlen ableiten
d$rndSd    <- sapply(d$rndScores, sd)
d$dead     <- sapply(d$rndScores, function(s) min(s) == max(s))
d$pct      <- mapply(function(s, p) 100 * mean(s >= p), d$rndScores, d$pimc)  # "besser+gleich %"
d$lead     <- d$rndMean - d$pimc                                             # Vorsprung PIMC
d$bits1    <- sapply(d$phaseStates, function(n) log2(ifelse(n[1] < 0, 20000, n[1])))  # nur Phase 1
d$pimcSec  <- d$pimcMs / 1000
d$won      <- d$pimc == 0

d <- d[!d$dead, ]   # tote Lagen (alle Random-Partien gleich) weglassen
cat(nrow(d), "Lagen\n")
print(summary(d[, c("pimc", "rndMean", "rndSd", "lead", "bits", "bits1", "pimcSec")]))

# schlanke Tabelle ohne die langen Spalten, z.B. fuer eigene Auswertungen
flat <- d[, c("d", "pimc", "rndMean", "rndMin", "rndSd", "lead", "pct", "bits", "bits1", "pimcSec", "capped", "won")]
write.csv(flat, "docs/results/freedom-flat.csv", row.names = FALSE)

# ---------------------------------------------------------------- Grafiken
dir.create("docs/results/plots", showWarnings = FALSE)
save <- function(p, name) {
  print(p)
  ggsave(file.path("docs/results/plots", name), p, width = 7, height = 5)
}

# 1. Rechenzeit vs. Random-Mittel 
save(ggplot(d, aes(rndMean, pimcSec)) +
       geom_point(alpha = 0.4) +
       geom_smooth(method = "loess", se = FALSE) +
       labs(x = "Random-Mittel (Score, tiefer = besser)", y = "PIMC-Rechenzeit [s]",
            title = "Rechenzeit vs. Schwierigkeit fuer den Zufallsspieler"),
     "zeit-vs-rndMean.png")

# 1. Rechenzeit vs. Random-Std
save(ggplot(d, aes(rndSd, pimcSec)) +
       geom_point(alpha = 0.4) +
       geom_smooth(method = "loess", se = FALSE) +
       labs(x = "Random-Standard Deviation", y = "PIMC-Rechenzeit [s]",
            title = "Rechenzeit vs. Variablität beim Zufallsspieler"),
     "zeit-vs-rndSd.png")

# 2. PIMC-Score vs. Freiheit (Siege farbig)
save(ggplot(d, aes(bits, pimc, colour = won)) +
       geom_jitter(alpha = 0.4, height = 0.3, width = 0) +
       geom_smooth(aes(group = 1), method = "loess", se = FALSE, colour = "black") +
       scale_colour_manual(values = c(`FALSE` = "grey40", `TRUE` = "red"), name = "gewonnen") +
       labs(x = "Freiheit [bit]", y = "PIMC-Score (tiefer = besser)",
            title = "PIMC-Score vs. Freiheitsgrad"),
     "pimc-vs-bits.png")

# 3. Vorsprung PIMC vs. Freiheit in Phase 1 (Eigenschaft der Lage selbst)
save(ggplot(d, aes(bits1, lead)) +
       geom_point(alpha = 0.4) +
       geom_smooth(method = "lm") +
       labs(x = "Freiheit Phase 1 [bit]", y = "Vorsprung PIMC (Random-Mittel - PIMC)",
            title = "Bringt kluges Spiel bei mehr Anfangsfreiheit weniger?"),
     "vorsprung-vs-bits1.png")

# 3.  PIMC vs. Freiheit in Phase 1 (Eigenschaft der Lage selbst)
save(ggplot(d, aes(bits1, rndMean)) +
       geom_point(alpha = 0.4) +
       geom_smooth(method = "lm") +
       labs(x = "Freiheit Phase 1 [bit]", y = "rndMean",
            title = "Mehr Anfangsfreiheit, leichtere Lage?"),
     "rndMean-vs-bits1.png")

# 4. Verteilung der Freiheit
save(ggplot(d, aes(bits)) +
       geom_histogram(binwidth = 1) +
       labs(x = "Freiheit [bit]", y = "Anzahl Lagen", title = "Verteilung des Freiheitsgrads"),
     "bits-histogramm.png")

# Korrelationen auf einen Blick
print(round(cor(flat[, c("pimc", "rndMean", "rndSd", "lead", "pct", "bits", "bits1", "pimcSec")]), 2))

