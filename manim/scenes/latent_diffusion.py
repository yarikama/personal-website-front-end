"""Clips for /learnings/latent-diffusion."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, split_formula, split_words, words


class FewerNumbers(Clip):
    """How many numbers one denoising step handles in pixels and in Stable
    Diffusion's latent, and their ratio split into the sides and the
    channels: 8 times 8 times three quarters is 48."""

    def construct(self):
        title = words("numbers one step handles", font_size=38, color=FADED).to_edge(UP, buff=0.7)

        image, ip = split_formula(
            R"\text{image}", "=", "512", R"\times", "512", R"\times", "3", "=", "786{,}432",
            font_size=56,
        )
        latent, lp = split_formula(
            R"\text{latent}", "=", "64", R"\times", "64", R"\times", "4", "=", "16{,}384",
            font_size=56,
            t2c={"16{,}384": SAGE},
        )
        image.next_to(title, DOWN, buff=0.7)
        latent.next_to(image, DOWN, buff=0.5)
        # Line the two up on their first equals sign
        latent.shift((ip[1].get_center()[0] - lp[1].get_center()[0]) * RIGHT)

        self.play(FadeIn(title, shift=0.2 * DOWN))
        self.play(Write(ip[:7]), run_time=1.6)
        self.play(FadeIn(ip[7:], shift=0.2 * LEFT))
        self.play(Write(lp[:7]), run_time=1.6)
        self.play(FadeIn(lp[7:], shift=0.2 * LEFT))
        self.wait(0.8)

        # The ratio, a side and the channels at a time
        ratio, rp = split_formula(
            R"\frac{512}{64}", R"\times", R"\frac{512}{64}", R"\times", R"\frac{3}{4}",
            "=", "8", R"\times", "8", R"\times", R"\frac{3}{4}", "=", "48",
            font_size=60,
            t2c={"48": SAGE},
        )
        ratio.next_to(latent, DOWN, buff=0.8)
        self.play(
            FadeTransform(VGroup(ip[2], lp[2]).copy(), rp[0]),
            FadeIn(rp[1]),
            FadeTransform(VGroup(ip[4], lp[4]).copy(), rp[2]),
            FadeIn(rp[3]),
            FadeTransform(VGroup(ip[6], lp[6]).copy(), rp[4]),
            run_time=2,
        )
        self.wait(0.5)
        self.play(FadeIn(rp[5:11], shift=0.2 * LEFT), run_time=1.4)
        sides = Brace(rp[6:9], DOWN, buff=0.15).set_fill(FADED)
        sides_said = words("the sides: 64", font_size=34, color=FADED).next_to(sides, DOWN, buff=0.15)
        channel = Brace(rp[10], DOWN, buff=0.15).set_fill(FADED)
        channel_said = words("4 numbers, not 3", font_size=34, color=FADED).next_to(channel, DOWN, buff=0.15)
        channel_said.shift(0.6 * RIGHT)
        self.play(GrowFromCenter(sides), FadeIn(sides_said))
        self.play(GrowFromCenter(channel), FadeIn(channel_said))
        self.wait(0.6)
        self.play(FadeIn(rp[11:], shift=0.2 * LEFT))
        self.play(Indicate(rp[12], color=SAGE, scale_factor=1.25))
        self.wait(0.6)

        # Over fifty steps
        steps, sp = split_words(
            "50 steps:", "39.3 million", "numbers in pixels,", "0.82 million", "in the latent",
            font_size=36,
        )
        sp[1].set_fill(INK)
        sp[3].set_fill(SAGE)
        steps.to_edge(DOWN, buff=0.6)
        self.play(FadeOut(VGroup(sides, sides_said, channel, channel_said)), FadeIn(steps, shift=0.2 * UP), run_time=1.2)
        self.wait(3)
