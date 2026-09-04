package com.maxrave.simpmusic.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.Font
import simpmusic.composeapp.generated.resources.Res
import simpmusic.composeapp.generated.resources.poppins_bold
import simpmusic.composeapp.generated.resources.poppins_medium
import simpmusic.composeapp.generated.resources.poppins_regular

@Composable
fun fontFamilyBody(): FontFamily =
    FontFamily(
        Font(Res.font.poppins_regular, FontWeight.Normal, FontStyle.Normal),
        Font(Res.font.poppins_medium, FontWeight.Medium, FontStyle.Normal),
    )

@Composable
fun fontFamilyDisplay(): FontFamily =
    FontFamily(
        Font(Res.font.poppins_bold, FontWeight.Bold, FontStyle.Normal),
        Font(Res.font.poppins_medium, FontWeight.Medium, FontStyle.Normal),
    )

@Composable
fun fontFamilyLabel(): FontFamily =
    FontFamily(
        Font(Res.font.poppins_medium, FontWeight.Medium, FontStyle.Normal),
        Font(Res.font.poppins_regular, FontWeight.Normal, FontStyle.Normal),
    )

@Composable
fun typo(): Typography {
    val bodyFont = fontFamilyBody()
    val displayFont = fontFamilyDisplay()
    val labelFont = fontFamilyLabel()

    val typo =
        Typography(
            /***
             * This typo().is use for the title of the Playlist, Artist, Song, Album, etc. in Home, Mood, Genre, Playlist, etc.
             */
            titleSmall =
                TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = labelFont,
                    color = Color(0xFFE6E3E3),
                    letterSpacing = (-0.1).sp,
                ),
            titleMedium =
                TextStyle(
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = displayFont,
                    color = Color(0xFFE6E3E3),
                ),
            titleLarge =
                TextStyle(
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = displayFont,
                    color = Color(0xFFE6E3E3),
                    letterSpacing = (-0.2).sp,
                ),
            bodySmall =
                TextStyle(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Normal,
                    fontFamily = bodyFont,
                    color = Color(0xFFADAAAA),
                ),
            bodyMedium =
                TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Normal,
                    fontFamily = bodyFont,
                    color = Color(0xFFADAAAA),
                ),
            bodyLarge =
                TextStyle(
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Normal,
                    fontFamily = bodyFont,
                    color = Color(0xFFADAAAA),
                ),
            displayLarge =
                TextStyle(
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = displayFont,
                    color = Color(0xFFE6E3E3),
                    letterSpacing = (-0.3).sp,
                ),
            headlineMedium =
                TextStyle(
                    fontSize = 22.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = displayFont,
                    color = Color(0xFFE6E3E3),
                ),
            headlineLarge =
                TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = displayFont,
                    color = Color(0xFFE6E3E3),
                ),
            labelMedium =
                TextStyle(
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = labelFont,
                    color = Color(0xFFADAAAA),
                ),
            labelSmall =
                TextStyle(
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    fontFamily = labelFont,
                    color = Color(0xFFADAAAA),
                ),
            // ...
        )
    return typo
}
