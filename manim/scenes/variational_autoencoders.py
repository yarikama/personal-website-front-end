"""Clips for /learnings/variational-autoencoders."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class KlClosedForm(Clip):
    """The KL divergence of a blob N(mu, sigma^2) from N(0, 1): the average
    gap between the two log densities, two averages, and the closed form,
    then three worked numbers."""

    def construct(self):
        said = words("how far the blob $q$ is from the standard bell $p$", font_size=36, color=FADED)
        said.to_edge(UP, buff=0.5)
        kl = formula(
            R"D_{\mathrm{KL}}(q \,\|\, p) = \mathrm{avg}_{z \sim q}\big[\log q(z) - \log p(z)\big]",
            font_size=52,
        )
        kl.next_to(said, DOWN, buff=0.45)
        self.play(Write(said), run_time=1.6)
        self.play(Write(kl), run_time=2)
        self.wait(0.6)

        # The two log densities
        lq = formula(R"\log q(z) = -\tfrac12 \ln 2\pi\sigma^2 - \frac{(z-\mu)^2}{2\sigma^2}", font_size=52)
        lp = formula(R"\log p(z) = -\tfrac12 \ln 2\pi - \frac{z^2}{2}", font_size=52)
        logs = VGroup(lq, lp).arrange(DOWN, buff=0.4).next_to(kl, DOWN, buff=0.6)
        self.play(FadeIn(lq, shift=0.2 * DOWN), run_time=1)
        self.play(FadeIn(lp, shift=0.2 * DOWN), run_time=1)
        self.wait(1)

        # Their gap: the 2 pi cancels
        gap, gp = split_formula(
            R"\log q - \log p",
            "=",
            R"-\tfrac12 \ln \sigma^2",
            "-",
            R"\frac{(z-\mu)^2}{2\sigma^2}",
            "+",
            R"\frac{z^2}{2}",
            font_size=52,
        )
        gap.move_to(logs)
        self.play(FadeTransform(logs, gap), run_time=1.4)
        self.wait(0.6)

        # Averaged over the blob, the two squares become numbers
        hint = words(R"over the blob: $(z-\mu)^2$ averages $\sigma^2$, and $z^2$ averages $\mu^2 + \sigma^2$", font_size=34, color=SAGE)
        avg, ap = split_formula(
            R"\mathrm{avg}",
            "=",
            R"-\tfrac12 \ln \sigma^2",
            "-",
            R"\tfrac12",
            "+",
            R"\tfrac12(\mu^2 + \sigma^2)",
            font_size=52,
        )
        avg.next_to(gap, DOWN, buff=0.7)
        hint.next_to(avg, DOWN, buff=0.5)
        ap[4].set_fill(SAGE)
        ap[6].set_fill(SAGE)
        self.play(FadeIn(hint), run_time=1)
        self.play(
            TransformFromCopy(gp[0:4], ap[0:4]),
            FadeTransform(gp[4].copy(), ap[4]),
            TransformFromCopy(gp[5], ap[5]),
            FadeTransform(gp[6].copy(), ap[6]),
            run_time=2,
        )
        self.wait(1)

        # Gathered: the closed form
        result = formula(R"D_{\mathrm{KL}} = \tfrac12\big(\mu^2 + \sigma^2 - \ln\sigma^2 - 1\big)", font_size=60, color=SAGE)
        result.next_to(kl, DOWN, buff=0.7)
        self.play(FadeOut(gap), FadeOut(hint), ReplacementTransform(avg, result), run_time=1.6)
        self.wait(0.8)

        # Three worked numbers
        rows = VGroup(
            formula(R"\mu = 0,\ \sigma = 1:\quad \tfrac12(0 + 1 - 0 - 1) = 0", font_size=52),
            formula(R"\mu = 2,\ \sigma = 1:\quad \tfrac12(4 + 1 - 0 - 1) = 2", font_size=52),
            formula(R"\mu = 0,\ \sigma = 0.1:\quad \tfrac12(0 + 0.01 + 4.61 - 1) = 1.81", font_size=52),
        ).arrange(DOWN, buff=0.35, aligned_edge=LEFT)
        rows.next_to(result, DOWN, buff=0.7)
        for row in rows:
            self.play(FadeIn(row, shift=0.2 * RIGHT), run_time=0.9)
            self.wait(0.5)
        self.play(Indicate(result, color=INK, scale_factor=1.05))
        self.wait(3)
