package com.maxrave.simpmusic.ui.component

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Done
import androidx.compose.material3.ElevatedFilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalMinimumInteractiveComponentSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.maxrave.simpmusic.ui.theme.md_theme_dark_onSurfaceVariant
import com.maxrave.simpmusic.ui.theme.md_theme_dark_primary
import com.maxrave.simpmusic.ui.theme.md_theme_dark_secondary
import com.maxrave.simpmusic.ui.theme.sonara_surface_container_high

@Composable
fun Chip(
    isAnimated: Boolean = false,
    isSelected: Boolean = false,
    text: String,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(20.dp)
    InfiniteBorderAnimationView(
        isAnimated = isAnimated && isSelected,
        brush = Brush.sweepGradient(listOf(md_theme_dark_primary, md_theme_dark_secondary, md_theme_dark_primary)),
        backgroundColor = Color.Transparent,
        contentPadding = 0.dp,
        borderWidth = if (isSelected) 1.5.dp else 1.dp,
        shape = shape,
        oneCircleDurationMillis = 2500,
    ) {
        CompositionLocalProvider(LocalMinimumInteractiveComponentSize provides Dp.Unspecified) {
            ElevatedFilterChip(
                shape = shape,
                colors =
                    FilterChipDefaults.elevatedFilterChipColors(
                        containerColor = sonara_surface_container_high,
                        iconColor = md_theme_dark_primary,
                        selectedContainerColor = md_theme_dark_primary.copy(alpha = 0.18f),
                        labelColor = md_theme_dark_onSurfaceVariant,
                        selectedLabelColor = md_theme_dark_primary,
                    ),
                onClick = { onClick.invoke() },
                label = {
                    Text(text, maxLines = 1)
                },
                border =
                    FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected,
                        selectedBorderColor = md_theme_dark_primary.copy(alpha = 0.6f),
                        borderColor = md_theme_dark_onSurfaceVariant.copy(alpha = 0.35f),
                    ),
                selected = isSelected,
                leadingIcon = {
                    AnimatedContent(isSelected) {
                        if (it) {
                            Icon(
                                imageVector = Icons.Filled.Done,
                                contentDescription = "Done icon",
                                modifier = Modifier.size(FilterChipDefaults.IconSize),
                            )
                        }
                    }
                },
                modifier =
                    Modifier.background(
                        color = if (isSelected) md_theme_dark_primary.copy(alpha = 0.08f) else Color.Transparent,
                        shape = shape,
                    ),
            )
        }
    }
}
