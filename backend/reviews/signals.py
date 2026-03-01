from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import ReviewerProfile


@receiver(post_delete, sender=ReviewerProfile)
def delete_cv_file_on_profile_delete(sender, instance, **kwargs):
    if instance.cv:
        instance.cv.delete(save=False)


@receiver(pre_save, sender=ReviewerProfile)
def delete_replaced_cv_file(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_instance = ReviewerProfile.objects.get(pk=instance.pk)
    except ReviewerProfile.DoesNotExist:
        return

    old_cv = old_instance.cv
    new_cv = instance.cv
    if old_cv and old_cv != new_cv:
        old_cv.delete(save=False)
